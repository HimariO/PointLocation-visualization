
function relative_pos(node, p) {
  switch(node.type) {
    case 'point':
      if(node.meta.x == p.x && node.meta.y == p.y)
        return 'OVERLAP'
      return node.meta.x > p.x ? 'LEFT' : 'RIGHT'

    case 'segment':
      let sg_a = node.meta.p_a
      let sg_b = node.meta.p_b
      let delta_x =  sg_b.x - sg_a.x
      let delta_y =  sg_b.y - sg_a.y

      if (p.y > sg_a.y && p.y > sg_b.y) {
        return 'UP'
      }
      else if (p.y < sg_a.y && p.y < sg_b.y) {
        return 'DOWN'
      }
      else if ((p.x == sg_a.x && p.y == sg_a.y) || (p.x == sg_b.x && p.y == sg_b.y)) {
        return 'OVERLAP'
      }
      else {
        let f_Px = (p.x - sg_b.x) * (delta_y / delta_x) + sg_b.y
        if (f_Px == p.y) return 'OVERLAP'
        return f_Px > p.y ? 'DOWN' : 'UP'
      }
  }
}


function swap_leaf(leaf, new_node) {
  let parent = leaf.parent
  if (parent.left == leaf) {
    parent.left = new_node
  }
  else if (parent.right == leaf) {
    parent.right = new_node
  }
  else {
    throw Error('[swap_leaf] This child have no parent!?')
  }
  new_node.parent = parent
}

function swap_d3_leaf(d3_tree, leaf, new_node) {
  let parent = leaf.parent
  let d3_leaf = null
  let d3_parent = null

  d3_tree.each((node)=>{
    if(node.data.name == parent.name)
      d3_parent = node
    if(node.data.name == leaf.name)
      d3_leaf = node
  })

  mod_tree(d3_parent, d3_leaf, new_node)
}


function TrapezoidMap(canvas, d3_update) {
  this._canvas = canvas
  this._fabric_canvas = null
  this._fabric_objs = []
  this._fabric_points_link = []

  this._d3_update = d3_update

  this._op_mode = 'MOVE'
  this.DEBUG = true

  this.search_graph = {
    name: 'T1', type: 'trapezoid',
    parent: null, left: null, right: null,
    meta: null
  }

  this._graph_dict = {}
  this._segment_dict = {}
  this._point_list = []
}


TrapezoidMap.prototype.debug = function(mes) {
  if(this.DEBUG)
    console.log(mes)
}


TrapezoidMap.prototype.initCanvas = function() {
  this._canvas.height = document.querySelector('#canvas-wrapper').offsetHeight
  this._canvas.width = document.querySelector('#canvas-wrapper').offsetWidth
  this._fabric_canvas = new fabric.Canvas(this._canvas)

  this._fabric_canvas.on('mouse:down', (o) => {

    isDown = true
    let pointer = this._fabric_canvas.getPointer(o.e)
    let origX = pointer.x
    let origY = pointer.y

    switch(this._op_mode) {
      case 'MOVE':
        break

      case 'LINK':
        if(o.target) {
          console.log(o.target, this._fabric_points_link)
          this._fabric_points_link.push(o.target)
          o.target.set({ stoke: 'rgb(3, 192, 220)' })
          this._fabric_canvas.renderAll()

          if(this._fabric_points_link.length >= 2) {
            let two_points = this._fabric_points_link.sort((A, B) => A.left - B.left)
            this.add_segment(
              {
                x: Number.parseInt(two_points[0].left),
                y: Number.parseInt(two_points[0].top)
              },
              {
                x: Number.parseInt(two_points[1].left),
                y: Number.parseInt(two_points[1].top)
              }
            )

            let line = new fabric.Line(
              [
                two_points[0].left + two_points[0].width / 2,
                two_points[0].top + two_points[0].height / 2,
                two_points[1].left + two_points[1].width / 2,
                two_points[1].top + two_points[1].height / 2,
              ],
              {
                fill: '#fff',
                stroke: '#fff',
                strokeWidth: 2,
                selectable: false
              }
            )

            this._fabric_objs.push(line)
            this._fabric_points_link = []
            this._fabric_canvas.add(line)
            this._fabric_canvas.renderAll()
            console.log('Add LInk')
          }
        }
        break

      case 'ADD':
        let c_id = this._fabric_objs.length
        let c = new fabric.Circle({
          left: origX,
          top: origY,
          strokeWidth: 2,
          radius: 6,
          fill: '#fff',
          stroke: '#666',
          lockScalingX: true,
          lockScalingY: true,
        })

        this._fabric_canvas.add(c)
        c.on('mousedown', ()=>{
          // console.log(`# c mouse:down ${c_id}`)
        })
        c.on('mouseup', ()=>{
          // console.log(`# c mouse:up ${c_id}`)
        })
        c.setCoords()
        this._fabric_objs.push(c)
        this._fabric_canvas.renderAll()
        break
    }
  })
}


TrapezoidMap.prototype.initD3Tree = function() {
  let margin = { top: 20, right: 90, bottom: 30, left: 90 }
  let width = document.documentElement.clientWidth - margin.left - margin.right
  let height = document.documentElement.clientHeight - margin.top - margin.bottom

  this.d3_root = d3.hierarchy(map.search_graph, function(d) {
    let child = [d.left, d.right].filter( x => x )
    return child.length > 0 ? child : undefined
  })
  this.d3_treemap  = d3.tree().size([height, width])
  this.d3_svg = d3
    .select("body")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  this.d3_root.x0 = height / 2
  this.d3_root.y0 = 0
  this._d3_update(this.d3_root, this.d3_treemap, this.d3_svg)
}


/**
* Add segemnt into ploygon & search graph by given two end point of the segment.
* @param p_a point_A of segment {x: int, y: int, name: str}
* @param p_b point_B of segment {x: int, y: int, name: str}
* Assert point_A.x < point_B.x
*/
TrapezoidMap.prototype.add_segment = function(p_a, p_b) {
  let leaf_a = this.query(p_a)
  let leaf_b = this.query(p_b)
  const ID = Object.keys(this._segment_dict).length

  if(leaf_a == leaf_b) { // segement be contained in single trapezoid
    let parent = leaf_a.parent
    let T_A = {
      name: `T${ID}A`, type: 'trapezoid',
      parent: null, left: null, right: null, meta: null
    }

    let T_B = {
      name: `T${ID}B`, type: 'trapezoid',
      parent: null, left: null, right: null, meta: null
    }

    let T_C = {
      name: `T${ID}C`, type: 'trapezoid',
      parent: null, left: null, right: null, meta: null
    }

    let T_D = {
      name: `T${ID}D`, type: 'trapezoid',
      parent: null, left: null, right: null, meta: null
    }

    let S = {
      name: `S${ID}`, type: 'segment',
      parent: null,
      left: T_B,
      right: T_C,
      meta: {
        p_a: null,
        p_b: null
      }
    }
    T_B.parent = T_C.parent = S

    let Q = {
      name: `Q${ID}`, type: 'point',
      parent: null,
      left: S,
      right: T_D,
      meta: {
        x: p_b.x,
        y: p_b.y
      }
    }
    S.parent = T_D.parent = Q

    let P = {
      name: `P${ID}`, type: 'point',
      parent: parent,
      left: T_A,
      right: Q,
      meta: {
        x: p_a.x,
        y: p_a.y
      }
    }
    Q.parent = T_A.parent = P
    S.meta.p_a = p_a
    S.meta.p_b = p_b

    if (parent !== null) {
      swap_leaf(leaf_a, P)
      swap_d3_leaf(this.d3_root, leaf_a, P)
      this._d3_update(this.d3_root, this.d3_treemap, this.d3_svg)
    }
    else { // this trapezoid node is root
      this.search_graph = P

      // TODO: Wrap this into a function or something
      let temp_x0 = this.d3_root.x0
      this.d3_root = d3.hierarchy(P, function(d) {
        let child = [d.left, d.right].filter( x => x )
        return child.length > 0 ? child : undefined
      })
      this.d3_root.x0 = temp_x0
      this.d3_root.y0 = 0
      this._d3_update(this.d3_root, this.d3_treemap, this.d3_svg)
    }
  }
  else {
    let trapezoids = this.cross_trapezoid(p_a, p_b)
    let left_most = trapezoids[0]
    let right_most = trapezoids.end()

    this.debug('----[Left Right]----')
    this.debug(trapezoids)
    this.debug(leaf_a)
    this.debug(leaf_b)

    if(leaf_a) assert(left_most == leaf_a)
    if(leaf_b) assert(right_most == leaf_b)

    const get_S = () => (
      {
        name: `S${ID}`, type: 'segment',
        parent: null,
        left: null,
        right: null,
        meta: {
          p_a: p_a,
          p_b: p_b
        }
      }
    )

    let S_list = [get_S()]
    let D3_update = []

    for (let i = 0; i < trapezoids.length; i++) {
      let S_i = get_S()
      S_list.push(S_i)

      let T_up = {
        name: `T${ID}_${i}U`, type: 'trapezoid',
        parent: S_i, left: null, right: null, meta: null
      }
      let T_dw = {
        name: `T${ID}_${i}D`, type: 'trapezoid',
        parent: S_i, left: null, right: null, meta: null
      }
      S_i.left = T_up
      S_i.right = T_dw

      // if p_a or p_b overlap with other point leaf_A/B will be null.
      if((i == 0 && leaf_a != null) || (i == trapezoids.length - 1 && leaf_b != null)) {
        let isLeft = (
          (i == 0 && trapezoids.length > 1)
          || (i == 0 && leaf_a != null && trapezoids.length == 1)
        )

        let T_A = {
          name: `T${ID}_${i}A`, type: 'trapezoid',
          parent: null, left: null, right: null, meta: null
        }

        let PQ = {
          name: isLeft ? `P${ID}` : `Q${ID}`,
          type: 'point',
          parent: left_most.parent,
          left: isLeft ? T_A : S_i,
          right: !isLeft ? T_A : S_i,
          meta: {
            x: isLeft ? p_a.x : p_b.x,
            y: isLeft ? p_a.y : p_b.y
          }
        }

        this.debug(`[${i}] ${PQ.name}, ${leaf_a}`)

        S_i.parent = T_A.parent = PQ

        swap_d3_leaf(this.d3_root, trapezoids[i], PQ)
        this._d3_update(this.d3_root, this.d3_treemap, this.d3_svg)
        swap_leaf(trapezoids[i], PQ)
      }
      else {
        swap_d3_leaf(this.d3_root, trapezoids[i], S_i)
        this._d3_update(this.d3_root, this.d3_treemap, this.d3_svg)
        swap_leaf(trapezoids[i], S_i)
      }
    }

  }

  this._point_list.push(p_a)
  this._point_list.push(p_b)
  this._segment_dict[`S${ID}`] = {}
}


/**
* Find every trapezoid segment come across.
* @param p_a point_A of segment {x: int, y: int}
* @param p_b point_B of segment {x: int, y: int}
* Assert point_A.x < point_B.x
*/
TrapezoidMap.prototype.cross_trapezoid = function(p_a, p_b) {
  this._point_list = this._point_list
  let pre_trap = null
  let trap_list = []
  let sample_list = this._point_list.map((e, i) => [
    { x: e.x + 1, y: e.y },
    { x: e.x - 1, y: e.y },
  ])
  .reduce((a, b) => a.concat(b))
  .sort((A, B) => A.x - B.x)

  this.debug('-----------[Sample points]-----------')
  this.debug(sample_list)

  for(let point of sample_list) {
    if(point.x < p_a.x || point.x > p_b.x)
      continue

    let f_Px = (point.x - p_b.x) * ((p_b.y - p_a.y) / (p_b.x - p_a.x)) + p_b.y
    let sample_trapezoid = this.query({x: point.x, y: f_Px})

    if(sample_trapezoid == pre_trap) {
      continue
    }
    else {
      pre_trap = sample_trapezoid
      trap_list.push(sample_trapezoid)
    }
  }

  return trap_list
}


/**
* @param p point object of segment {x: int, y: int, name: str}
* @return graph_node(p located inside trapezoid) or null(p located on segemnt)
*/
TrapezoidMap.prototype.query = function(p) {
  let current_node = this.search_graph
  const yolo = (node) => node.type != 'trapezoid' || (node.left || node.right) || node == null

  while(yolo(current_node)) {
    // this.debug(current_node)
    // this.debug(relative_pos(current_node, p))
    switch (relative_pos(current_node, p)) {
      case 'RIGHT':
        current_node = current_node.right
        break

      case 'LEFT':
        current_node = current_node.left
        break

      case 'UP':
        current_node = current_node.left
        break

      case 'DOWN':
        current_node = current_node.right
        break

      case 'OVERLAP':
        return null

      default:
        throw Error(`Unexpected this!`)
    }
  }

  return current_node
}

// console.log(test)
