import * as DataHandler from './dataHandler.js'

const nodelinkDivId = 'nodelinkFrame'
const nodelinkSvgId = 'nodelink'
const nodelinkHeight = $('#' + nodelinkDivId).innerHeight()
const nodelinkWidth = $('#' + nodelinkDivId).innerWidth()
const nodeHighLightColor = 'orange'
const MaxRadius = 10
const forceLayout = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d._id))
    .force('charge', d3.forceManyBody())
    .force('centerX', d3.forceX(nodelinkWidth / 2))
    .force('centerY', d3.forceY(nodelinkHeight / 2))
        // .force('center', d3.forceCenter(nodelinkWidth / 2, nodelinkHeight / 2))
let linkLayer
let nodeLayer
let times
/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 */
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

let getNodeRadius = function(d) {
    return Math.sqrt(d.links().length) * 0.5 + 1;
  // return 3
}
let getNodeColor = function (d) {
  return '#aaaaaa'
}
let nodeOnClick = function (d) {
  DataHandler.handleSelect(d.index)
}
let nodeOnHover = function (d) {
  let id = d.index
  let label = window.dgraph.nodeArrays.label[id]
  d3.select(this)
    .style('fill', nodeHighLightColor)
  tooltip.transition()
    .duration(200)
    .style("opacity", .9)
  tooltip.html(label)
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px")
}
let nodeOutHover = function (d) {
  d3.select(this)
    .style('fill', networkcube.getPriorityColor(d))
  tooltip.transition()
    .duration(500)
    .style("opacity", 0)
}
let tooltip = d3.select('body')
  .append('div')
  .classed('tooltip', true)
  .style('opacity', 0)

let getLineStroke = function (d) {
  return 2
}
let getLineColor = function (d) {
  return '#4dcfff' // lightblue
}
let debug = function () {
  console.log('Nodelink View DEBUG')
  console.log('width', nodelinkWidth, 'height', nodelinkHeight)
}

let drawNodeLinkInPeriod = function (m) {
  let dg = window.dgraph
  let start = m.startUnix
  let end = m.endUnix
  let startId = binarySearch(dgraph.timeArrays.unixTime, d => d >= start)
  let endId = binarySearch(dgraph.timeArrays.unixTime, d => d >= end)
  linkLayer.style('display', d => {
    if(d.presentIn(times[startId], times[endId])) {
      return ''
    }
    else{
      return 'none'
    }
  })
}

let drawNodeLink = function () {
  let dg = window.dgraph
  times = dg.times().toArray()
  let links = dg.links().toArray()
  let nodes = dg.nodes().toArray()
  let perfectScale = function(dg) {
    let minx = 0, maxx = 0, miny = 0, maxy = 0
    for (let node of nodes) {
      minx = Math.min(minx, node.x)
      maxx = Math.max(maxx, node.x)
      miny = Math.min(miny, node.y)
      maxy = Math.max(maxy, node.y)
    }
    let ratiox =  2 *  Math.max(maxx, -minx) / nodelinkWidth
    let ratioy =  2 * Math.max(maxy, -miny) / nodelinkHeight
    // console.log(minx, maxx, ratiox, nodelinkWidth, miny, maxy, ratioy, nodelinkHeight)
    nodes.forEach(d => {
        d.x = (d.x - nodelinkWidth / 2)  / ratiox + nodelinkWidth / 2
        d.y = (d.y - nodelinkHeight / 2) / ratioy + nodelinkHeight / 2
    })
  }
  // create canvas
  let svg = d3.select('#' + nodelinkSvgId)
    .attr('height', nodelinkHeight)
    .attr('width', nodelinkWidth)
  let g = svg.append('g')

  g.append('text')
    .text('Calculating')
    .attr('id', 'tmp')
    .style('text-anchor', 'middle')
    .attr('x', nodelinkWidth / 2)
    .attr('y', nodelinkHeight / 2)

// create simulation of force layout
  forceLayout
    .nodes(nodes)
    .on('end', function() {
  linkLayer = g.append('g')
    .classed('linkLayer', true)
    .selectAll('.links')
    .data(links)
    .enter()
    .append('line')
    .classed('links', true)
    .attr('id', d => `link_${d.index}`)
    .style('stroke-width', getLineStroke)
    .style('stroke', d => networkcube.getPriorityColor(d))
    .style('opacity', 0.5)

  nodeLayer = g.append('g')
    .classed('nodeLayer', true)
    .selectAll('.nodes')
    .data(nodes)
    .enter()
    .append('circle')
    .classed('nodes', true)
    .attr('id', d => `node_${d.index}`)
    .attr('r', getNodeRadius)
    .style('fill', d => networkcube.getPriorityColor(d))
    .on('click', nodeOnClick)
    .on('mouseover', nodeOnHover)
    .on('mouseout', nodeOutHover)

    d3.select('#tmp').remove()

    perfectScale(dg)
    linkLayer
        .attr('x1', function(d) { return d.source.x})
        .attr('y1', function(d) { return d.source.y })
        .attr('x2', function(d) { return d.target.x })
        .attr('y2', function(d) { return d.target.y })

    nodeLayer
      .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')' })
    d3.select('#' + nodelinkSvgId)
      .call(d3.zoom()
          .scaleExtent([2 / 3, 10])
          .on('zoom', function() {
            g.attr('transform', d3.event.transform);
          }))
  })
  forceLayout.force('link')
    .links(links)

    networkcube.addEventListener('timeRange', drawNodeLinkInPeriod)
}
export {drawNodeLink, debug, getNodeRadius, getLineStroke}
