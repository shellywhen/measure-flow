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


let getNodeRadius = function(d) {
  return 1
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
    .style('fill', getNodeColor(d))
  tooltip.transition()
    .duration(500)
    .style("opacity", 0)
}
let tooltip = d3.select('body')
  .append('div')
  .classed('tooltip', true)
  .style('opacity', 0)

let getLineStroke = function (d) {
  return 1
}
let getLineColor = function (d) {
  return '#4dcfff' // lightblue
}
let debug = function () {
  console.log('Nodelink View DEBUG')
  console.log('width', nodelinkWidth, 'height', nodelinkHeight)
}

let drawNodeLink = function () {
  let dg = window.dgraph
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
    nodes.forEach(function (d) {
      d.x = d.x  / ratiox + nodelinkWidth / 2
      d.y = d.y / ratioy + nodelinkHeight / 2
      let radius = getNodeRadius(d)
      if (nodelinkWidth / 2 - d.x < MaxRadius) d.x -= radius
      else if (nodelinkWidth / 2 + d.x < - MaxRadius) d.x += radius
      if (nodelinkHeight/ 2 - d.y < MaxRadius) d.y -= radius
      else if (nodelinkHeight / 2 + d.y < - MaxRadius) d.y += radius
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
  let linkLayer = g.append('g')
    .classed('linkLayer', true)
    .selectAll('.links')
    .data(links)
    .enter()
    .append('line')
    .classed('links', true)
    .attr('id', d => `link_${d.index}`)
    .style('stroke-width', getLineStroke)
    .style('stroke', getLineColor)
    .style('opacity', 0.5)

  let nodeLayer = g.append('g')
    .classed('nodeLayer', true)
    .selectAll('.nodes')
    .data(nodes)
    .enter()
    .append('circle')
    .classed('nodes', true)
    .attr('id', d => `node_${d.index}`)
    .attr('r', getNodeRadius)
    .style('fill', getNodeColor)
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
}
export {drawNodeLink, debug, getNodeRadius, getLineStroke}
