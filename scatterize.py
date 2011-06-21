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
from stats.statsrunner import StatsRunner
import wsgi_utils
import settings

app = flask.Flask(__name__, settings.STATIC_PATH)
app.wsgi_app = wsgi_utils.ReverseProxied(app.wsgi_app)

add_url_helpers(app)

@app.route("/")
def index():
    return flask.render_template("index.html")
    
@app.route("/about")
def about():
    return flask.render_template("about.html")

@app.route("/save_svg", methods=["GET", "POST"])
def save_svg():
    preamble = """<?xml version="1.0" standalone="no"?>

<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
"""
    svgdata = request.form.get("svg_data", "")
    response = flask.make_response(preamble+svgdata)
    response.headers["Content-Disposition"] = "attachment; filename=plot.svg"
    return response

@app.route("/d", methods=["POST"])
def upload():
    import hashlib
    file_raw = request.files['csvfile']
    lines = file_raw.read().splitlines()
    dialect = csv.Sniffer().sniff("\n".join(lines[0:settings.SNIFF_LINES]))
    reader = csv.reader(lines, dialect=dialect)
    h = hashlib.sha1()
    rows = list(reader)
    h.update(str(rows))
    short_hash = h.hexdigest()[0:settings.HASH_PREFIX_CHARS]
    filename = "%s.csv" % (short_hash)
    with open("%s/%s" % (settings.STORAGE_DIR, filename), 'w') as outfile:
        writer = csv.writer(outfile, dialect="excel")
        writer.writerows(rows)
    g.filename = filename
    g.rows = rows
    return flask.redirect(flask.url_for('scatter_frame', filehash=short_hash))

@app.route("/d/<filehash>")
def scatter_frame(filehash):
    rows = []
    with open("%s/%s.csv" % (settings.STORAGE_DIR, filehash), 'rt') as csvfile:
        reader = csv.reader(csvfile, dialect="excel")
        rows = list(reader)
    g.column_names = rows[0]
    g.rows = rows
    g.filehash = filehash
    
    return flask.render_template("scatter_frame.html")

@app.route("/d/<filehash>/regress.js")
def regress_js(filehash):
    filename = "%s/%s.csv" % (settings.STORAGE_DIR, filehash)
    
    x_idx = int(request.args.get("x", 0))
    y_idx = int(request.args.get("y", 0))
    nuis_idxs = []
    nlist = request.args.get("n", "").strip()
    if nlist != "":
        nuis_idxs = [int(i) for i in nlist.split(",")]
    
    censor_idxs = []    
    clist = request.args.get("c", "").strip()
    if clist != "":
        censor_idxs = [int(i) for i in clist.split(",")]
    
    mtype = request.args.get("m", "OLS")
    highlight_idx = request.args.get("h", None)
    
    sr = StatsRunner(filename, y_idx, x_idx, nuis_idxs, 
        highlight_idx, censor_idxs, mtype)
    result = sr.run()
    return flask.jsonify(result)

if __name__ == "__main__":
    app.debug = True
    app.run()