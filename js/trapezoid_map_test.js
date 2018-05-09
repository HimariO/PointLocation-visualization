//#############################[ Dev Test ]####################################

let test = relative_pos(
  {
    type: 'segment',
    meta: {
      p_a: { x: 0, y: 0 },
      p_b: { x: 3, y: 9 }
    }
  },
  { x: 1, y: 1.5 }
)

function test_simple_insert_query() {

  map = new TrapezoidMap(document.querySelector('#poly-map'), update)
  map.initCanvas()

  $('#btn-add').click(()=>{
    map._op_mode = 'ADD'
  })

  $('#btn-move').click(()=>{
    map._op_mode = 'MOVE'
  })

  $('#btn-link').click(()=>{
    map._op_mode = 'LINK'
  })

  map.initD3Tree()
  // map.add_segment({x:1, y:2}, {x:5, y:6})

  let T0A = map.query({x: 0, y: 0})
  console.log(`%cT0A ${T0A.name == 'T0A'}`, 'background: green; color: white; display: block;')

  let T0B = map.query({x: 2, y: 6})
  console.log(`%cT0B ${T0B.name == 'T0B'}`, 'background: green; color: white; display: block;')

  let T0C = map.query({x: 3, y: 0})
  console.log(`%cT0C ${T0C.name == 'T0C'}`, 'background: green; color: white; display: block;')

  let T0D = map.query({x: 6, y: 6})
  console.log(`%cT0D ${T0D.name == 'T0D'}`, 'background: green; color: white; display: block;')

  // map.add_segment({x:-10, y:0}, {x:10, y:0})
  // map.add_segment({x:-10, y:0}, {x:-2, y:3})
}

test_simple_insert_query()
