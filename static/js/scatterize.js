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
    
    my.set_scales = function() {
      my.x = pv.Scale.linear(0, 1).range(0, w);
      my.y = pv.Scale.linear(0, 1).range(0, h);
    };
    
    my.add_rules = function() {
      pub.vis.add(pv.Rule)
        .data(my.x.ticks())
        .left(my.x);
      pub.vis.add(pv.Rule)
        .data(my.y.ticks())
        .bottom(my.y);
    }
    
    pub.draw_data = function(points) {
      my.set_scales()
      my.add_rules()
      pub.set_points(points)
      pub.vis.render();
    }
    
    pub.my = my; // debugging fun
    return pub;
  }
}