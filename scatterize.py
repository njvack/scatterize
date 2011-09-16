#!/usr/bin/env python

# coding: utf8
# Part of scatterize -- a statistical exploration tool
#
# Copyright (c) 2011 Board of Regents of the University of Wisconsin System
#
# scatterize is licensed under the GPLv3 -- see LICENSE for details.
#
# Written by Nathan Vack <njvack@wisc.edu> at the Waisman Laborotory
# for Brain Imaging and Behavior, University of Wisconsin - Madison.

import flask
from flask import g, request

import time
import csv
import numpy as np

from utils import add_url_helpers
from stats import statsrunner, statsfile
from stats.statsrunner import RegressionParams, StatsRunner
from stats.statsfile import CSVFileHandler

import wsgi_utils
import settings

app = flask.Flask(__name__, settings.STATIC_PATH)
app.wsgi_app = wsgi_utils.ReverseProxied(app.wsgi_app)

add_url_helpers(app)

statsrunner.logger = app.logger
statsfile.logger = app.logger


@app.route("/")
def index():
    return flask.render_template("index.html")


@app.route("/about")
def about():
    return flask.render_template("about.html")


@app.route("/save_svg", methods=["GET", "POST"])
def save_svg():
    preamble = """<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
"""
    svgdata = request.form.get("svg_data", "")
    response = flask.make_response(preamble+svgdata)
    response.headers["Content-Disposition"] = "attachment; filename=plot.svg"
    return response


@app.route("/d", methods=["POST"])
def upload():
    file_raw = request.files['csvfile']
    file_handler = CSVFileHandler(settings.STORAGE_DIR)
    short_hash = file_handler.save_upload(
        request.files['csvfile'],
        hash_len=settings.HASH_PREFIX_CHARS,
        sniff_lines=settings.SNIFF_LINES)

    return flask.redirect(flask.url_for('scatter_frame', filehash=short_hash))


@app.route("/d/<filehash>")
def scatter_frame(filehash):
    g.filehash = filehash
    file_handler = CSVFileHandler(settings.STORAGE_DIR)
    try:
        stats_data = file_handler.load_file(filehash)
    except:
        flask.abort(404)
    g.column_names = stats_data.column_names
    g.rows = stats_data.data_list

    return flask.render_template("scatter_frame.html")


@app.route("/d/<filehash>/regress.js")
def regress_js(filehash):
    file_handler = CSVFileHandler(settings.STORAGE_DIR)
    try:
        stats_data = file_handler.load_file(filehash)
    except:
        flask.abort(404)

    regression_params = RegressionParams.build_from_flask_args(request.args)
    sr = StatsRunner(stats_data, regression_params)
    result = sr.run()

    # Trim a couple things from the result -- won't need 'em
    del result['all_point_data']
    del result['all_point_cols']
    return flask.jsonify(result)


@app.route("/d/<filehash>/regress.csv")
def regress_csv(filehash):
    import StringIO
    file_handler = CSVFileHandler(settings.STORAGE_DIR)
    try:
        stats_data = file_handler.load_file(filehash)
    except:
        flask.abort(404)

    regression_params = RegressionParams.build_from_flask_args(request.args)
    sr = StatsRunner(stats_data, regression_params)
    result = sr.run()

    # Build us a string in memory
    out_buf = StringIO.StringIO()
    writer = csv.writer(out_buf, dialect='excel')
    writer.writerow(result['all_point_cols'])
    writer.writerows(result['all_point_data'])

    response = flask.make_response(out_buf.getvalue())
    response.headers["Content-Disposition"] = "attachment;filename=data.csv"
    response.headers["Content-Type"] = "text/csv"
    return response


if __name__ == "__main__":
    app.debug = True
    app.run()
