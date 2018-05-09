
Array.prototype.end = function() {
  return this[this.length - 1]
}

function assert(cond, mes) {
  if(!cond)
    throw Error('Assertion fail! ' + mes)
}

function mod_tree(parent_node, leaf_node, child_data, swap=true) {
  let sub_tree = d3.hierarchy(child_data, function(d) {
    let child = [d.left, d.right].filter( x => x )
    return child.length > 0 ? child : undefined
  })
  let ID = Date.now()

  const depth_offset = (tree) => {
    tree.depth += parent_node.depth + 1

    if(tree.children)
      for(let ch of tree.children)
        depth_offset(ch)
  }

  const height_update = (leaf) => {
    leaf.height += sub_tree.height
    if(leaf.parent !== null)
      height_update(leaf.parent)
  }

  depth_offset(sub_tree)
  sub_tree.parent = parent_node
  // sub_tree.
  console.log(`---------{Parent Tree}---------`)
  console.dir(parent_node)
  console.log(`---------{New Tree}---------`)
  console.dir(sub_tree)

  if(parent_node.children === undefined) {
    parent_node.children = [sub_tree]
  }
  else {
    if(swap) {
      let leaf_id = parent_node.children.findIndex((e)=>{
        return e.data.name == leaf_node.data.name
      })
      parent_node.children.splice(leaf_id, 1, sub_tree)
    }
    else {
      parent_node.children.push(sub_tree)
    }
  }

  if(parent_node.data.children === undefined) {
    parent_node.data.children = [sub_tree.data]
  }
  else {
    if(swap) {
      let leaf_id = parent_node.data.children.findIndex((e)=>{
        return e.name == leaf_node.data.name
      })
      parent_node.data.children.splice(leaf_id, 1, sub_tree.data)
    }
    else {
      parent_node.data.children.push(sub_tree.data)
    }
  }
}


function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

var i = 0
var duration = 500
  // root;

function update(source, treemap, svg) {
  var treeData = treemap(source);

  var nodes = treeData.descendants(),
    links = treeData.descendants().slice(1)

  nodes.forEach(function(d) {
    d.y = d.depth * 100;
  });

  var node = svg.selectAll("g.node").data(nodes, function(d) {
    return d.id || (d.id = ++i);
  });

  var nodeEnter = node
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) {
      return "translate(" + source.x0 + "," + source.y0 + ")";
      // return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on("click", click);

  nodeEnter
    .attr("class", "node")
    .attr("r", 1e-6)
    .style("fill", function(d) {
      return d.parent ? "rgb(39, 43, 77)" : "#fe6e9e";
    });

  nodeEnter
    .append("rect")
    .attr("rx", function(d) {
      if (d.parent) return d.children || d._children ? 0 : 6;
      return 10;
    })
    .attr("ry", function(d) {
      if (d.parent) return d.children || d._children ? 0 : 6;
      return 10;
    })
    .attr("stroke-width", function(d) {
      return d.parent ? 1 : 0;
    })
    .attr("stroke", function(d) {
      return d.children || d._children
        ? "rgb(3, 192, 220)"
        : "rgb(38, 222, 176)";
    })
    .attr("stroke-dasharray", function(d) {
      return d.children || d._children ? "0" : "2.2";
    })
    .attr("stroke-opacity", function(d) {
      return d.children || d._children ? "1" : "0.6";
    })
    .attr("x", 0)
    .attr("y", -10)
    .attr("width", function(d) {
      return d.parent ? 40 : 20;
    })
    .attr("height", 20);

  nodeEnter
    .append("text")
    .style("fill", function(d) {
      if (d.parent) {
        return d.children || d._children ? "#ffffff" : "rgb(38, 222, 176)";
      }
      return "rgb(39, 43, 77)";
    })
    .attr("dy", ".35em")
    .attr("x", function(d) {
      return d.parent ? 20 : 10;
    })
    .attr("text-anchor", function(d) {
      return "middle";
    })
    .text(function(d) {
      return d.data.name;
    });

  var nodeUpdate = nodeEnter.merge(node);

  nodeUpdate
    .transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
      // return "translate(" + d.y + "," + d.x + ")";
    });

  var nodeExit = node
    .exit()
    .transition()
    .duration(duration)
    .attr("transform", function(d) {
      return "translate(" + source.x + "," + source.y + ")";
      // return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();
  nodeExit.select("rect").style("opacity", 1e-6);
  nodeExit.select("rect").attr("stroke-opacity", 1e-6);
  nodeExit.select("text").style("fill-opacity", 1e-6);

  var link = svg.selectAll("path.link").data(links, function(d) {
    return d.id;
  });

  var linkEnter = link
    .enter()
    .insert("path", "g")
    .attr("class", "link")
    .attr("d", function(d) {
      var o = { x: source.x0, y: source.y0 };
      // var o = { x: source.y0, y: source.x0 };
      return diagonal(o, o);
    });

  var linkUpdate = linkEnter.merge(link);
  linkUpdate
    .transition()
    .duration(duration)
    .attr("d", function(d) {
      d.x += 20
      return diagonal(d, d.parent);
    });

  var linkExit = link
    .exit()
    .transition()
    .duration(duration)
    .attr("d", function(d) {
      var o = { x: source.x, y: source.y };
      // var o = { x: source.y, y: source.x };
      return diagonal(o, o);
    })
    .remove();

  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });

  function diagonal(s, d) {
    path = `M ${s.x} ${s.y}
            C ${(s.x + d.x) / 2} ${s.y},
              ${(s.x + d.x) / 2} ${d.y},
              ${d.x} ${d.y}`;

    return path;
  }

  function click(d) {
    console.dir(d)
    // if(d.children === undefined || true){
    //   console.log('!')
    //   // mod_tree(d, { name: 'NEW' })
    // }
    // else if (d.children) {
    //   d._children = d.children;
    //   d.children = null;
    // } else {
    //   d.children = d._children;
    //   d._children = null;
    // }
    // update(d);
  }
}
