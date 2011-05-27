#!/usr/bin/env python
import flask
import time
app = flask.Flask(__name__)

ASSET_TIME = int(time.time())

@app.route("/")
def index():
    flask.g.time = ASSET_TIME
    return flask.render_template("index.html")

if __name__ == "__main__":
    app.debug = True
    app.run()