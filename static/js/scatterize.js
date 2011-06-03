var S = {
  'scatterplot': function(canvas, w, h) {
    var pub = {};
    var my = {};
    pub.vis = new pv.Panel()
      .canvas(canvas)
      .width(w)
      .height(h)
      .bottom(20)
      .top(20)
      .left(20)
      .right(20);
    
    pub.set_points = function(points) {
      pub.points = points;
      my.xvals = points.map(function(p) {return p[0]; });
      my.yvals = points.map(function(p) {return p[1]; });
    };
    
    pub.draw_points = function(points) {
      pub.vis.add(pv.Dot)
        .data(points)
        .left(function(p) {return my.x(p[0]);})
        .bottom(function(p) {return my.y(p[1]);});
    }
    
    my.set_scales = function(points) {
      my.x = pv.Scale.linear(pv.min(my.xvals), pv.max(my.xvals)).range(0, w);
      my.y = pv.Scale.linear(pv.min(my.yvals), pv.max(my.yvals)).range(0, h);
    };
    
    pub.regression_line = function(slope, intercept, color) {
      if (!color) { color = "#000"; }
      pub.vis.add(pv.Line)
        .data(my.xvals)
        .strokeStyle(color)
        .bottom(function(xval) { return my.y((slope*xval)+intercept);})
        .left(function(xval) { return my.x(xval);});
    }
    
    my.add_rules = function() {
      pub.vis.add(pv.Rule)
        .data(my.x.ticks())
        .left(my.x);
      pub.vis.add(pv.Rule)
        .data(my.y.ticks())
        .bottom(my.y)
      .anchor("left").add(pv.Label)
        .text(my.y.tickFormat);
    }
    
    pub.draw_data = function(points) {
      pub.set_points(points);
      my.set_scales(points);
      my.add_rules();
      pub.draw_points(points)
      pub.vis.render();
    }
    
    pub.my = my; // debugging fun
    return pub;
  }
}