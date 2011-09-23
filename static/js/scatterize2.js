var S2 = function($, d3) {
  var S_my = {};
  
  S_my.scatterplot = function(container, 
      data_width, data_height, 
      data_outer_margin,
      axis_margin, 
      label_width,
      x_label_margin,
      y_label_margin) {
    
    var my = {},
      pub = {}, 
      svg = d3.select(container).append('svg:svg');
    
    my.data_width = data_width;
    my.data_height = data_height;
    my.data_outer_margin = data_outer_margin;
    my.label_width = label_width;
    my.axis_margin = axis_margin;
    my.x_label_margin = x_label_margin;
    my.y_label_margin = y_label_margin;
    my.height = (data_outer_margin + my.data_height + 
      my.axis_margin + my.label_width + my.x_label_margin);
    my.width = (data_outer_margin + my.data_width + 
      my.axis_margin + my.label_width + my.y_label_margin);
    my.data_canvas_trans_y = my.data_outer_margin;
    my.data_canvas_trans_x = my.x_label_margin + my.label_width + 2*my.axis_margin;
    
    svg.attr('height', my.height)
      .attr('width', my.width)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr('style', 'background-color: #EEF;');
    
    
    my.data_canvas = svg.append('svg:g')
      .attr('transform', 'translate('+my.data_canvas_trans_x+','+my.data_canvas_trans_y+')');
    my.data_rect = my.data_canvas
      .append('svg:rect')
      .attr('width', my.data_width)
      .attr('height', my.data_height)
      .style('fill', '#CCE');
    
    pub.set_data = function(points) {
      my.point_data = points.map(function(p) {
        return {x:p[0], y:p[1]};
      });
      my.xvals = my.point_data.map(function(p) { return p.x; });
      my.yvals = my.point_data.map(function(p) { return p.y; });

      console.log(my.xvals);
      my.x_scale = d3.scale.linear()
        .domain([d3.min(my.xvals), d3.max(my.xvals)])
        .range([0, my.data_width]);
      
      my.y_scale = d3.scale.linear()
        .domain([d3.min(my.yvals), d3.max(my.yvals)])
        .range([my.data_height, 0]);
      
      my.data_canvas.selectAll('circle')
          .data(my.point_data)
        .enter().append('svg:circle')
          .attr('cx', function(d) { 
            return my.x_scale(d.x); })
          .attr('cy', function(d) { return my.y_scale(d.y); })
          .attr('r', 4.5);
    }
    console.log("hello");
    pub.my = my;
    return pub;
  }
  
  
  
  return S_my;
}(jQuery, d3);