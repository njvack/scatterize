import web
import settings

def static_path(base, filename):
    return "/".join([web.ctx['homepath'], base, filename])

def js_path(filename):
    return static_path(settings.JS_PATH, filename)

def img_path(filename):
    return static_path(settings.IMG_PATH, filename)

def css_path(filename):
    return static_path(settings.CSS_PATH, filename)
