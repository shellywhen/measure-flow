import * as RadarChart from '../../lib/js/radarChart.js'
let svgWidth
let svgHeight
const margin = {top: 30, right: 20, bottom: 30, left: 20}
const color = d3.scale.ordinal().range(["#EDC951","#CC333F","#00A0B0"])
let legendWidth
let legendHeight
const legendDiv = 'radarLegendDiv'
export let drawStatView = function (divId) {
    svgWidth = $(`#${divId}`).innerWidth()
    svgHeight = $(`#${divId}`).innerHeight()
    legendWidth = $(`#${legendDiv}`).innerWidth()
    legendHeight = $(`#${legendDiv}`).innerHeight()
    networkcube.addEventListener('period', updateStat)
    let momentTime = window.dgraph.timeArrays.momentTime
    let msg = {
      body: {
        start: momentTime[0]._i,
        end: momentTime[momentTime.length - 1]._i
      }
    }
    updateStat(msg)
}
let updateStat = function (msg) {
  let start = msg.body.start
  let end = msg.body.end
  let startId = binarySearch(dgraph.timeArrays.unixTime, d => d >= start)
  let endId = binarySearch(dgraph.timeArrays.unixTime, d => d >= end)
  let groups  = [{'id': 1, 'node': [0, 1, 2, 3, 4, 5, 6, 7], 'name': 'Group 1'}, {'id': 2, 'node': [8, 9, 10, 11, 12, 13, 14, 15, 16], 'name': 'Group 2'}]
  let globalNodeList = {'id': 0, 'node': dgraph.nodeArrays.id, 'name': 'global'}
  groups.unshift(globalNodeList)
  updateLegend(groups)
  let data = wrapGroup(groups, startId, endId)
  let width = svgWidth - margin.left - margin.right
  let height = svgHeight- margin.top - margin.bottom


  let radarChartOptions = {
    w: width,
    h: height,
    margin: margin,
    maxValue: getMaxValue(data),
    levels: 3,
    roundStrokes: true,
    color: color,
    dotRadius: 3
  }
  //Call function to draw the Radar chart
  RadarChart.RadarChart("#radarDiv", data, radarChartOptions)
}

let updateLegend = function (groups) {
  d3.select(`#${legendDiv}`).select('svg').remove()
  let svg = d3.select(`#${legendDiv}`)
    .append('svg')
    .attr('height', legendHeight)
    .attr('width', legendWidth)
    .append('g')
    .attr('transform', `translate(10, ${margin.right})`)
  svg.selectAll(".legendDots")
  .data(groups)
  .enter()
  .append("circle")
    .classed('legendDots', true)
    .attr("cx", 0)
    .attr("cy", function(d,i){ return 0 + i*20}) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 7)
    .style("fill", function(d, i){ return color(i)})

// Add one dot in the legend for each name.
  svg.selectAll(".legendLabels")
    .data(groups)
    .enter()
    .append("text")
      .classed('legendLabels', true)
      .attr("x", 20)
      .attr("y", function(d,i){ return 0 + i*20}) // 100 is where the first dot appears. 25 is the distance between dots
      .style("fill", d => 'black')
      .text(function(d){ return d.name})
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")

}

let getAdjMatrix = function (nodeList, startId, endId) {
  let dgraph = window.dgraph
  let adjMatrix = Array.from(Array(nodeList.length), _ => Array(nodeList.length).fill(0))
  for (let t = startId; t <= endId; t++) {
    let links = dgraph.timeArrays.links[t]
    let nodeMap = {}
    nodeList.forEach((v, i) => {
      nodeMap[v] = i
    })
    links.forEach(lid => {
      let target = dgraph.linkArrays.target[lid]
      let source = dgraph.linkArrays.source[lid]
      if(nodeList.includes(target) && nodeList.includes(source)) {
        adjMatrix[nodeMap[target]][nodeMap[source]] += 1
        adjMatrix[nodeMap[source]][nodeMap[target]] += 1
      }
    })
  }
  return adjMatrix
}

let wrapGroup = function (groups, startId, endId) {
  let dgraph = window.dgraph
  let neighbors = dgraph.nodeArrays.neighbors
  let timeArray = dgraph.timeArrays
  let data = groups.map(v => groupProcess(v, startId, endId))
  return data
}

let getMaxValue = function (res) {
  let maxValue = new Array(res[0].length).fill(1)
  res.forEach(item => {
    item.forEach((measure, i) => {
      maxValue[i] = Math.max(maxValue[i], measure.value)
    })
  })
  return maxValue
}

let groupProcess = function (v, startId, endId) {
  let nodeList = v.node
  let adjMatrix = getAdjMatrix(nodeList, startId, endId)
  let connectedComponent = getConnectedComponent(v.node, startId, endId)
  let diameter = getDiameter(adjMatrix)
  let transition = getTransition(adjMatrix)
  let nodeNumber = getNodeNumber(v.node, startId, endId)
  let linkPair =  getLinkPairNumber(adjMatrix)
  let linkNumber = getLinkNumber(adjMatrix)
  let densityValue =  2 * linkPair.value/((nodeNumber.value - 1) * nodeNumber.value)
  if (Number.isNaN(densityValue)) densityValue = 0
  let density = {axis: 'Density', value: densityValue}
  let results = [
    connectedComponent,
    diameter,
    transition,
    nodeNumber,
    linkNumber,
    density
  ]
  return results
}

let getNodeNumber = function (nodes, startId, endId) {
  let cnt = 0
  for (let node of nodes) {
    let neighbors = window.dgraph.nodeArrays.neighbors[node].serie
    for (let t = startId; t <= endId; t++ ) {
      if (t in neighbors) {
        cnt ++
        break
      }
    }
  }
  return {axis: 'Node Number', value: cnt}
}

let getLinkPairNumber = function (adjMatrix) {
  let matrix = JSON.parse(JSON.stringify(adjMatrix))
  for (let i in matrix) {
    for (let j in matrix[i]) {
      matrix[i][j] = matrix[i][j] > 0 ? 1 : 0
    }
  }
  let sum = 0
  matrix.forEach(row => row.forEach(v => {
    sum += v
  }))
  sum /= 2
  return {axis: 'Node Pair Number', value: sum}
}

let getLinkNumber = function (adjMatrix) {
  let sum = 0
  adjMatrix.forEach(row => row.forEach(v => {
    sum += v
  }))
  sum /= 2
  return {axis: 'Node Pair Number', value: sum}
}

let getConnectedComponent = function(nodeList, startId, endId) {
  let flags = new Array(nodeList.length).fill(false)
  let map = new Map()
  let component = nodeList.map((v, i) => i)
  nodeList.forEach((v, i) => {map[v] = i})
  let queue = [0]
  for (let nid in nodeList) {
    if(!flags[nid]) queue.push(nid)
    while (queue.length > 0) {
      let i = queue.pop()
      if (flags[i]==true) continue
      flags[i] = true
      let allNeighbors = [...getNeighborDuringInterval(nodeList[i], startId, endId)]
      let neighbors = allNeighbors.filter(x => nodeList.includes(x));
      neighbors.forEach(v => {
        if (!flags[map[v]]) {
          queue.push(map[v])
          component[map[v]] = component[i]
        }
      })
    }
    return {axis: 'Connected Component', value: new Set(component).size}
  }
  let group = new Set()
  component.forEach((v, i) => {
    if (v != i) group.add(v)
  })
}

let getNeighborDuringInterval = function (node, startId, endId) {
  let nodes = []
  let neighbors = window.dgraph.nodeArrays.neighbors[node].serie
  for(let t = startId; t <= endId; t ++) {
    if (t in neighbors) {
      neighbors[t].forEach(v => {
        nodes.push(v)
      })
    }
  }
  return new Set(nodes)
}

let getTransition = function (mat) {
  let close = 0
  let open = 0
  for (let i in mat) {
    for (let j in mat) {
      for (let k in mat) {
        if (mat[i][j] && mat[i][k]) {
          if (mat[j][k]) {
            close += 1
          }
          else {
            open += 1
          }
        }
      }
    }
  }
  close /= 3
  let transition = close / (close + open)
  return {axis: 'Transition', value: transition}
}

let getDiameter = function (adjMatrix) {
  let dist = JSON.parse(JSON.stringify(adjMatrix))
  for (let i in dist) {
    for (let j in dist[i]) {
      dist[i][j] = dist[i][j] > 0 ? 1 : Number.POSITIVE_INFINITY
    }
  }
  let diameter = 0
  for (let i in dist) {
    for (let j in dist) {
      for (let k in dist) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j]
        }
      }
      if (dist[i][j] !== Number.POSITIVE_INFINITY) {
        diameter = Math.max(diameter, dist[i][j])
      }
    }
  }
  return {axis: 'Diameter', value: diameter}
}
function binarySearch(array, pred) {
    let lo = -1, hi = array.length;
    while (1 + lo < hi) {
        const mi = lo + ((hi - lo) >> 1);
        if (pred(array[mi])) {
            hi = mi;
        } else {
            lo = mi;
        }
    }
    return hi;
}
