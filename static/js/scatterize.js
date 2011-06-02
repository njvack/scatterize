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
      pub.vis.add(pv.Dot)
        .data(points)
        .left(function(p) {return my.x(p[0]);})
        .bottom(function(p){return my.y(p[1]);});
    };
    
    my.set_scales = function(points) {
      var xvals = points.map(function(p) {return p[0]; });
      var yvals = points.map(function(p) {return p[1]; });
      my.x = pv.Scale.linear(pv.min(xvals), pv.max(xvals)).range(0, w);
      my.y = pv.Scale.linear(pv.min(yvals), pv.max(yvals)).range(0, h);
    };
    
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
      my.set_scales(points)
      my.add_rules()
      pub.set_points(points)
      pub.vis.render();
    }
    
    pub.my = my; // debugging fun
    return pub;
  }
}