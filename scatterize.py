#!/usr/bin/env python
import flask
import time

import numpy as np

app = flask.Flask(__name__)

ASSET_TIME = int(time.time())

def at_render(t):
    flask.g.time = ASSET_TIME
    return flask.render_template(t)

@app.route("/")
def index():
    return at_render("index.html")

@app.route("/g/<filehash>")
def show_thing(f):
    pass

@app.route("/scatter.js")
def scatter():
    points = np.random.random(size=200).reshape((-1,2)).tolist()
    return flask.jsonify(points=points)
    
if __name__ == "__main__":
    app.debug = True
    app.run()