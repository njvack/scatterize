# coding: utf8
# Part of scatterize -- a statistical exploration tool
#
# Copyright (c) 2011 Board of Regents of the University of Wisconsin System
#
# scatterize is licensed under the GPLv3 -- see LICENSE for details.
#
# Written by Nathan Vack <njvack@wisc.edu> at the Waisman Laborotory
# for Brain Imaging and Behavior, University of Wisconsin - Madison.
#
# This implements file reading & writing. Right now, it's all CSV-based,
# but we could do a lot of neat things with, say, HDF5.

import os
import csv
import hashlib
import base64
import numpy as np
import pandas

import logging
logger = logging.getLogger("statsrunner")


def float_or_nan(num_str):
    try:
        return float(num_str)
    except:
        return np.nan


class CSVFileHandler(object):
    """
    Handles reading and writing (and hash generation) CSV files.
    """

    def __init__(self, storage_dir):
        self.storage_dir = storage_dir
        self.header_idx = 0
        self.write_dialect = 'excel' # We could change this, but it's... tricky
        self.np_delimiter = ','

    def load_file(self, file_hash):
        """
        Given a hash, read a file and generate a numpy array and everything.
        Raise an exception if anything goes amiss.
        """
        filename = self.file_path(file_hash)
        logger.debug("CSVFileHandler: Loading %s" % filename)
        skip_header = self.header_idx+1
        with open(filename, 'rt') as f:
            dataframe = pandas.read_csv(f)

            return StatsData(
                file_hash=file_hash,
                dataframe=dataframe)

    def save_upload(self, infile, hash_len, sniff_lines):
        """
        Save a file to storage_dir, naming it with a hash determined from the
        file's contents.
        """
        infile_data = infile.read()
        lines = infile_data.splitlines()
        dialect = csv.Sniffer().sniff("\n".join(lines))
        reader = csv.reader(lines, dialect=dialect)
        data_list = list(reader)
        full_hash = self._hash_for_list(data_list)
        short_hash = self._get_short_hash(full_hash, hash_len)
        if self._file_exists(short_hash):
            logger.debug("Not re-uploading %s" % short_hash)
            return short_hash
        out_path = self.file_path(short_hash)
        with open(out_path, 'w') as f:
            logger.debug("Creating %s" % out_path)
            writer = csv.writer(f, dialect=self.write_dialect)
            writer.writerows(data_list)
        return short_hash

    def file_path(self, file_hash):
        return os.path.join(self.storage_dir, file_hash)+".csv"

    def _hash_for_list(self, data_list):
        h = hashlib.sha1()
        h.update(str(data_list))
        return base64.urlsafe_b64encode(h.digest())

    def _file_exists(self, file_hash):
        return os.path.isfile(self.file_path(file_hash))

    def _get_short_hash(self, long_hash, starting_length):
        short_hash = ''
        for hash_len in range(starting_length, len(long_hash)):
            short_hash = long_hash[0:hash_len]

            if not self._file_exists(short_hash):
                logger.debug("Yay! %s is free!" % short_hash)
                return short_hash
            fname = self.file_path(short_hash)
            rows = []
            with open(fname, 'rt') as f:
                reader = csv.reader(f, dialect=self.write_dialect)
                rows = list(reader)
            candidate_hash = self._hash_for_list(rows)
            if long_hash == candidate_hash:
                logger.debug("Yay! %s is the same file!" % short_hash)
                return short_hash
            logger.debug("%s <> %s -- trying one longer..." % (
                long_hash, candidate_hash))
        return short_hash


class StatsData(object):
    def __init__(self, file_hash, dataframe):

        self.file_hash = file_hash
        self.dataframe = dataframe
        self.column_names = list(dataframe.columns)
        self.data_list = dataframe.values