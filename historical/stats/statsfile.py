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

import logging
logger = logging.getLogger("statsrunner")


def float_or_nan(num_str):
    try:
        return float(num_str)
    except:
        return np.nan


# These two functions are from: http://docs.python.org/2/library/csv.html
def unicode_csv_reader(unicode_csv_data, dialect=csv.excel, **kwargs):
    # csv.py doesn't do Unicode; encode temporarily as UTF-8:
    csv_reader = csv.reader(utf_8_encoder(unicode_csv_data),
                            dialect=dialect, **kwargs)
    for row in csv_reader:
        # decode UTF-8 back to Unicode, cell by cell:
        yield [unicode(cell, 'utf-8') for cell in row]


def utf_8_encoder(unicode_csv_data):
    for line in unicode_csv_data:
        yield line.encode('utf-8')


def skip_utf8_bom(f):
    """
    Requires an open file -- seeks seeks to byte 0, reads 3 bytes. If they're
    a UTF-8 BOM, skip them.
    Sigh.
    """
    f.seek(0)
    bom_test = f.read(3)
    if bom_test != '\xef\xbb\xbf': # UTF-8 byte-order mark
        f.seek(0)


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
        skip_header = self.header_idx + 1
        with open(filename, 'rt') as f:
            skip_utf8_bom(f)
            reader = unicode_csv_reader(f, dialect=self.write_dialect)
            dl = list(reader)
            column_names = dl[self.header_idx]
            data_list = dl[skip_header:]
            floated = [[float_or_nan(v) for v in row] for row in data_list]
            data_array = np.array(floated, dtype=float)

            return StatsData(
                file_hash=file_hash,
                column_names=column_names,
                data_list=data_list,
                data_array=data_array)

    def save_upload(self, infile, hash_len, sniff_lines):
        """
        Save a file to storage_dir, naming it with a hash determined from the
        file's contents.
        """
        skip_utf8_bom(infile)
        infile_data = infile.read()
        lines = infile_data.splitlines()
        dialect = csv.Sniffer().sniff("\n".join(lines))
        reader = unicode_csv_reader(lines, dialect=dialect)
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
        return os.path.join(self.storage_dir, file_hash) + ".csv"

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
                reader = unicode_csv_reader(f, dialect=self.write_dialect)
                rows = list(reader)
            candidate_hash = self._hash_for_list(rows)
            if long_hash == candidate_hash:
                logger.debug("Yay! %s is the same file!" % short_hash)
                return short_hash
            logger.debug("%s <> %s -- trying one longer..." % (
                long_hash, candidate_hash))
        return short_hash


class StatsData(object):

    def __init__(self, file_hash, column_names=None, data_list=None,
        data_array=None):

        self.file_hash = file_hash
        self.column_names = column_names
        self.data_list = data_list
        self.data_array = data_array
