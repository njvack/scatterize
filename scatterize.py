#!/usr/bin/env python

import web
import helpers

urls = (
    '/kitten', 'Kitten',
    '/(.*)', 'Hello'
)

scatterize = web.application(urls, globals())
render = web.template.render("templates", base="base", globals={'helpers':helpers})

class Kitten:
    def GET(self):
        return "I am kitten"

class Hello:
    def GET(self, name):
        name = name or "Fooooo"
        return render.index(name=name)

if __name__ == '__main__':
    scatterize.run()