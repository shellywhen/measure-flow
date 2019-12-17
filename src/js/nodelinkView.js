import * as DataHandler from './dataHandler.js'
import * as Timeline from './timelineView.js'

const nodelinkDivId = 'nodelinkFrame'
const nodelinkSvgId = 'nodelink'
const nodelinkHeight = $('#' + nodelinkDivId).height()
const nodelinkWidth = $('#' + nodelinkDivId).width()
const nodelinkheight = nodelinkHeight * 0.93
const nodeHighLightColor = 'orange'
const MaxRadius = 10
let xScale
let LINK_GAP = 2
let linkLayer
let nodeLayer
let nodeBackLayer
let nodeLayerG
let times
let nodes
let links
let lasso
let dg
let playerNodelink = function (m) {
  let data = m.body
  let interval = data.interval
  drawNodeLinkInPeriod(interval[0], interval[1]-1)
  updateTimeline(data.x0, data.x1, data.textStart, data.textEnd)
}
let getNodeRadius = function(d) {
    return Math.sqrt(d.links().length) * 0.5 + 1;
  // return 3
}
let getNodeColor = function (d) {
  if (typeof d === 'number') {
    d = nodes[d]
  }
  return networkcube.getPriorityColor(d)
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
    .style('opacity', .9)
  tooltip.html(label)
    .style('left', (d3.event.pageX) + 'px')
    .style('top', (d3.event.pageY - 28) + 'px')
}
let nodeOutHover = function (d) {
  d3.select(this)
    .style('fill', networkcube.getPriorityColor(d))
  tooltip.transition()
    .duration(500)
    .style('opacity', 0)
}
let highlightNodes = function (nodes) {
  nodes.forEach(nid => {
    d3.select(`#node_${nid}`)
      .style('fill', 'orange')
  })
}

let redrawNodes = function (nodes) {
  nodes.forEach(nid => {
    d3.select(`#node_${nid}`)
      .style('fill', getNodeColor(nid))
  })
}
let tooltip = d3.select('body').append('div').classed('tooltip', true).style('opacity', 0)
let configCell
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

let lasso_start = function () {
  lasso.items()
       .classed('selected',false);
}
let lasso_draw = function () {
   lasso.possibleItems()
       .classed('possible',true);
   lasso.notPossibleItems()
       .classed('possible',false);
}
let lasso_end = function () {
    let selectedCircles = lasso.selectedItems()
        .classed('selected', true)
    window.lasso_selection = selectedCircles._groups[0].map(d => d.__data__)
    d3.select('#lassoButton').style('display', '')
}

let drawNodeLinkInPeriod = function (startId, endId) {
  if(startId > endId) {
    linkLayer.style('display', 'none')
    nodeLayerG.style('opacity', 0.2)
    return
  }
  linkLayer.style('display', d => {
    if(d.presentIn(times[startId], times[endId])) {
      return ''
    }
    else{
      return 'none'
    }
  })
  nodeLayerG.style('opacity', 1)
  nodeLayer.attr('r', d => {
    let value = DataHandler.getLocalMeasure(d)
     return Math.sqrt(value) * 0.5 + 1;
  })
}

let cancelLasso = function () {
  lasso.items().classed('selected',false)
  lasso.items().classed('possible',false)
  dg.selection.forEach(v => {
    if (v.active) {
      v.active = false
      d3.select(`#hull_${v.id}`).style('fill-opacity', 0.3)
    }
  })
  d3.select('#lassoButton').style('display', 'none')
}
let lineGenerator = d3.line().x(d => d.x).y(d => d.y)//.curve(d3.curveCardinal)
let addSelection = function () {
  let id = dg.selection.length
  let color = dg.colorScheme[id]
  let selection = window.lasso_selection
  let convexHull = d3.select('.hullLayer').append("path")
  .attr("class",'hull')
  .attr("id", `hull_${id}`)
  .style('fill', color)
  .style('stroke', color)
  .on('click', function(d) {
    d3.select(this).style('fill-opacity', 0.8)
    window.selectionId = id
    d3.select('#lassoButton').style('display', '')
  })
  let circleData = d3.select('.nodeLayer').selectAll('.nodes').data()
  let circles = selection.map(v => {
    let circle = circleData[v.index]
    return [circle.x, circle.y]
  })
  let hull = d3.polygonHull(circles)
  convexHull
    .datum({'hull':hull, 'selection': selection.map(v => v.index), 'toggle': false})
    .attr('d', d => `M ${d.hull.join("L")} Z`)
  let subgraph = new Set(selection.map(v => v.index))
  networkcube.sendMessage('subgraph', {
    'selection': subgraph,
    'flag': true
  })
  lasso.items().classed('possible', false)
  d3.select('#lassoButton').style('display', 'none')
}

let expandSelection = function () {
  if(dg.selection.length < 1) return
  let addnodes = window.lasso_selection
  let oldList = dg.selection[window.selectionId].idList
  let newSet = new Set([...oldList, ...addnodes])
  let newList = Array.from(newSet)
  dg.selection[window.selectionId].idList = newList
  let circleData = d3.select('.nodeLayer').selectAll('.nodes').data()
  let circles = newList.map(v => {
    let circle = circleData[v.index]
    return [circle.x, circle.y]
  })
  let hull = d3.polygonHull(circles)
  d3.select(`#hull_${window.selectionId}`).datum(hull).enter().attr('d', d => `M ${d.join("L")} Z`)
  networkcube.sendMessage('subgraph', newSet)
  lasso.items().classed('possible',false)
  d3.select('#lassoButton').style('display', 'none')
}

let drawTimeline = function (svg) {
  let timelineWidth = (nodelinkWidth * 0.9)
  let h = 5
  let canvas = svg.append('g').classed('timelinehint', true)
    .attr('transform', `translate(${nodelinkWidth*0.05}, ${nodelinkHeight * 0.05 + h})`)
  canvas.append('line').attr('x1', 0).attr('x2', timelineWidth).attr('y1', 0).attr('y2', 0).style('stroke', 'gray').style('opacity', 0.5)
  xScale = d3.scaleTime().range([0, timelineWidth]).domain([dg.roundedStart, dg.roundedEnd])
  canvas.append('rect').classed('nodelink_timerange', true).attr('x', 0).attr('y', -h / 3).attr('width', timelineWidth).attr('height', 2 * h/3).style('opacity', 0.5).style('fill', 'gray').attr('rx', h / 2).attr('ry', h/2)
  canvas.append('circle').classed('nodelink_timepoint', true).attr('cx', 0).attr('cy', 0).attr('r', 0.8 * h).style('opacity', 1).style('fill', 'orange')
  canvas.append('text').attr('id', 'nodelink_textStart').text('').style('text-anchor', 'start')
    .attr('x', 0).attr('y', -h / 2).style('font-size', 'small')
  canvas.append('text').attr('id', 'nodelink_textEnd').text('').style('text-anchor', 'end')
    .attr('x', timelineWidth).attr('y', - h / 2).style('font-size', 'small')
}

let drawLassoConfig = function (svg) {
  let buttonWidth = (nodelinkWidth * 0.9 ) / 3
  let configCell = svg.append('g')
    .attr('transform', `translate(${0}, ${nodelinkheight})`)
    .attr('id', 'lassoButton')
    .style('display', 'none')
  let data = [{
    text:'New', class:'success', callback: addSelection
  }, {
    text:'Expand', class:'success', callback: expandSelection
  }, {
    text:'Cancel', class:'info', callback: cancelLasso
  }]
  configCell.selectAll('.badge')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d, i) => nodelinkWidth * 0.05 + buttonWidth * i + buttonWidth * 0.05)
    .attr('y', 0)
    .attr('width', buttonWidth * 0.9)
    .attr('height', (nodelinkHeight - nodelinkheight) * 0.9)
    .attr('rx', 2)
    .attr('ry', 5)
    .style('stroke', 'gray')
    .style('stroke-width', 1)
    .style('fill', 'white')

  configCell.selectAll('.config-label')
    .data(data)
    .enter()
    .append('text')
    .text(d => d.text)
    .attr('x', (d, i) => nodelinkWidth * 0.05 + buttonWidth * i + buttonWidth / 2)
    .attr('y', d => (nodelinkHeight - nodelinkheight) * 0.65)
    .style('text-anchor', 'middle')
    .style('cursor', 'pointer')
    .style('fill', 'black')
    .on('click', d => {
       d.callback(d)
     })
}
let perfectScale = function() {
  let minx = 0, maxx = 0, miny = 0, maxy = 0
  for (let node of nodes) {
    minx = Math.min(minx, node.x)
    maxx = Math.max(maxx, node.x)
    miny = Math.min(miny, node.y)
    maxy = Math.max(maxy, node.y)
  }
  let ratiox =  2 *  Math.max(maxx, -minx) / nodelinkWidth
  let ratioy =  2 *  Math.max(maxy, -miny) / nodelinkheight
  nodes.forEach(d => {
      d.x =  (d.x - nodelinkWidth / 2)  / ratiox + nodelinkWidth / 2
      d.y =  (d.y - nodelinkheight / 2) / ratioy + nodelinkheight / 2 + nodelinkHeight / 10
  })
}
let initNodeLink = function (svg, dgraph) {
  let g = svg.append('g').attr('id', 'nodeLinkCanvas')
  links = dgraph.links().toArray()
  nodes = dg.nodes().toArray()
  times = dg.times().toArray()
  let hullLayerG = g.append('g')
    .classed('hullLayer', true)
  linkLayer = g.append('g')
    .classed('linkLayer', true)
    .selectAll('.links')
      .data(links)
      .enter()
      .append('path')
      .classed('links', true)
      .style('stroke-width', getLineStroke)
      .style('fill-opacity', 0.2)
      .style('stroke-opacity', 0.5)
      .style('fill', '#d9d3d3')
      .attr('d', 'M0 0 L2 0 Z')
  nodeLayerG = g.append('g')
    .classed('nodeLayer', true)
  nodeBackLayer = nodeLayerG.selectAll('.back-nodes')
      .data(nodes)
      .enter()
      .append('circle')
      .classed('back-nodes', true)
      .attr('r', 1)
      .attr('cx', 0)
      .attr('cy', 0)
  nodeLayer = nodeLayerG.selectAll('.nodes')
    .data(nodes)
    .enter()
    .append('circle')
    .classed('nodes', true)
    .attr('r', 1)
    .attr('cx', 0)
    .attr('cy', 0)
    .style('fill', d => networkcube.getPriorityColor(d))
  g.append('text')
    .text('Calculating')
    .attr('id', 'tmp')
    .style('text-anchor', 'middle')
    .style('font-size', '3rem')
    .attr('x', nodelinkWidth / 2)
    .attr('y', nodelinkheight / 2 + nodelinkHeight / 10)
  return g
}

let drawLayout = function (svg) {
  dg = window.dgraph
  let g = initNodeLink(svg, dgraph)
  let forceLayout =  d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d._id))
      .force('charge', d3.forceManyBody())
      .force('centerX', d3.forceX(nodelinkWidth / 2))
      .force('centerY', d3.forceY(nodelinkheight / 2))
// create simulation of force layout
//
// .on('tick', function() {
//   nodeLayer
//     .attr('r', 1)
//     .attr('cx', 0)
//     .attr('cy', 0)
//     .attr('transform', d => {
//     return `translate(${d.x}, ${d.y})`
//   })
//  // linkLayer.attr('d', d => lineGenerator(d.path))
// })
  forceLayout
    .nodes(nodes)
    .on('end', function() {
      perfectScale(dg)
      calculateCurvedLinks()
      linkLayer
        .attr('d', d => lineGenerator(d.path))
        .attr('id', d => `link_${d.index}`)
        .style('stroke', d => networkcube.getPriorityColor(d))
     nodeBackLayer.attr('r', d =>Math.sqrt(DataHandler.getLocalMeasure(d, true)) * 0.5 + 1 )
        .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')' })
        .style('fill', '#b9b9b9')

     nodeLayer.attr('r', d => Math.sqrt(DataHandler.getLocalMeasure(d, true)) * 0.5 + 1)
       .attr('cx', 0)
       .attr('cy', 0)
       .attr('id', d => `node_${d.index}`)
       .attr('transform', function(d) {
          return 'translate(' + d.x + ',' + d.y + ')'
        })
       .on('click', nodeOnClick)
       .on('mouseover', nodeOnHover)
       .on('mouseout', nodeOutHover)

     lasso = d3.lasso()
      .closePathSelect(true)
      .closePathDistance(100)
      .items(nodeLayer)
      .targetArea(nodeLayerG)
      .on('start', lasso_start)
      .on('draw', lasso_draw)
      .on('end', lasso_end)
      nodeLayerG.call(lasso)

      d3.select('#tmp').remove()

      d3.select('#' + nodelinkSvgId)
        .call(d3.zoom()
            .scaleExtent([2 / 3, 10])
            .on('zoom', function() {
              g.attr('transform', d3.event.transform);
            }))
      networkcube.addEventListener('localMeasure', m => {
        nodeBackLayer.attr('r', d => {
          return Math.sqrt(DataHandler.getLocalMeasure(d, true)) * 0.5 + 1
        })
        nodeLayer.attr('r', d => {
          return Math.sqrt(DataHandler.getLocalMeasure(d)) * 0.5 + 1
        })
      })
  })
  forceLayout.force('link')
    .links(links)
}

let updateTimeline = function (start, end, startText='', endText='') {
  d3.select('.nodelink_timerange').attr('x', xScale(start)).attr('width', xScale(end) - xScale(start))
  d3.select('.nodelink_timepoint').attr('cx', (xScale(start) + xScale(end)) / 2)
  d3.select('#nodelink_textStart').text(startText)
  d3.select('#nodelink_textEnd').text(endText)
}

let updateInterval = function (m) {
  let data = m.body
  let svg = d3.select('#' + nodelinkSvgId)
  let canvas = svg.select('.timelinehint')
  canvas.select('.slotCanvas').remove()
  if(!data.flag) return
  let TIPS_CONFIG = data.tip
  let g = canvas.append('g').classed('slotCanvas', true).attr('transform', `translate(${0}, ${6})`)
  g.selectAll('.slot')
    .data(data.slot.period)
    .enter()
    .append('rect')
    .classed('slot', true)
    .attr('x', d => xScale(d.x0))
    .attr('width', d => Math.max(2, xScale(d.x1) - xScale(d.x0)))
    .attr('y', 0)
    .attr('rx', 1)
    .attr('ry', 1)
    .attr('height', d => {
      if (d.interval[1]>d.interval[0]) return 10
      return 5
    })
    .style('fill', d => {
      if(d.interval[1]>d.interval[0]) return 'orange'
      return 'lightslategray'
    })
    .style('stroke', d => {
      // if(d.interval[1]>d.interval[0]) return 'orange'
      return 'white'
    })
    .style('stroke-width', '1px')
    .style('opacity', 0.5)
    .style('cursor', 'pointer')
    .on('click', function (d, i) {
      d.textStart = d.x0.toLocaleDateString('en-US', TIPS_CONFIG)
      d.textEnd = d.x1.toLocaleDateString('en-US', TIPS_CONFIG)
      d3.selectAll('.snapshot').style('stroke',  '#E2E6EA')
      for (let tid = d.interval[0]; tid <d.interval[1]; tid++) {
        d3.select(`.snapshot_${tid}`).style('stroke', 'orange')
      }
      networkcube.sendMessage('brushMove', {'x0': d.x0, 'x1': d.x1})
      networkcube.sendMessage('player', d)
    })
    .on('mouseover', function (d) {
      d3.select(this).attr('y', -5).attr('height', 20)
      d.textStart = d.x0.toLocaleDateString('en-US', TIPS_CONFIG)
      d.textEnd = d.x1.toLocaleDateString('en-US', TIPS_CONFIG)
      d3.selectAll('.snapshot').style('stroke',  '#E2E6EA')
      for (let tid = d.interval[0]; tid <d.interval[1]; tid++) {
        d3.select(`.snapshot_${tid}`).style('stroke', 'orange')
      }
      networkcube.sendMessage('player', d)
    })
    .on('mouseout', function(d) {
      d3.select(this)
        .attr('height', v => {
        return d.interval[1]>d.interval[0]?10:5
      })
        .attr('y', 0)
      d3.selectAll('.snapshot').style('stroke',  '#E2E6EA')
    })
}

let drawNodeLink = function () {
  // create canvas
  d3.select('#' + nodelinkSvgId).html('')
  let svg = d3.select('#' + nodelinkSvgId)
    .attr('height', nodelinkHeight)
    .attr('width', nodelinkWidth)
  dg = window.dgraph
  drawTimeline(svg)
  drawLassoConfig(svg)
  drawLayout(svg)
  networkcube.addEventListener('player', playerNodelink)
  networkcube.addEventListener('timerange', m => {
    let dg = window.dgraph
    let start = m.body.startUnix
    let end = m.body.endUnix
    let startText = m.body.textStart
    let endText = m.body.textEnd
    updateTimeline(start, end, startText, endText)
    let startId = 0
    let endId = dg.timeArrays.unixTime.length - 1
    dg.timeArrays.unixTime.forEach((d, i) => {
        if(i!=0 && dg.timeArrays.unixTime[i-1] < start&&d>=start)
        startId = i
        if(i!=dg.timeArrays.unixTime.legth - 1&&dg.timeArrays.unixTime[i+1] > end && d <= end)
        endId = i
      })
    drawNodeLinkInPeriod(startId, endId)
    window.activeTime = {startId: startId, endId: endId, start: start, end: end}
  })
  networkcube.addEventListener('hint', m => {
    switch(m.body.action) {
      case 'add':
        dg.highlightArrays.nodeIds.push(...m.body.nodes)
        highlightNodes(dg.highlightArrays.nodeIds)
        break;
      case 'delete':
        dg.highlightArrays.nodeIds = dg.highlightArrays.nodeIds.filter(v => (! v in m.body.nodes))
        redrawNodes(m.body.nodes)
      break
    }
  })
  networkcube.addEventListener('gap', m => {
    LINK_GAP = m.body
    calculateCurvedLinks()
    linkLayer.attr('d', d => lineGenerator(d.path))
  })
  networkcube.addEventListener('nodelinkInterval', updateInterval)
}


function calculateCurvedLinks() {
  let dgraph = window.dgraph
    var path, dir, offset, offset2, multiLink;
    var _links;
    for (var i = 0; i < dgraph.nodePairs().length; i++) {
        multiLink = dgraph.nodePair(i);
        if (multiLink.links().length < 2) {
            multiLink.links().toArray()[0]['path'] = [
                { x: multiLink.source.x, y: multiLink.source.y },
                { x: multiLink.source.x, y: multiLink.source.y },
                { x: multiLink.target.x, y: multiLink.target.y },
                { x: multiLink.target.x, y: multiLink.target.y }
            ];
        }
        else {
            _links = multiLink.links().toArray();
            if (multiLink.source == multiLink.target) {
                var minGap = getNodeRadius(multiLink.source) / 2 + 4;
                for (var j = 0; j < _links.length; j++) {
                    _links[j]['path'] = [
                        { x: multiLink.source.x, y: multiLink.source.y },
                        { x: multiLink.source.x, y: multiLink.source.y - minGap - (i * LINK_GAP) },
                        { x: multiLink.source.x + minGap + (i * LINK_GAP), y: multiLink.source.y - minGap - (i * LINK_GAP) },
                        { x: multiLink.source.x + minGap + (i * LINK_GAP), y: multiLink.source.y },
                        { x: multiLink.source.x, y: -multiLink.source.y },
                    ];
                }
            }
            else {
                dir = {
                    x: multiLink.target.x - multiLink.source.x,
                    y: multiLink.target.y - multiLink.source.y
                };
                offset = stretchVector([-dir.y, dir.x], LINK_GAP);
                offset2 = stretchVector([dir.x, dir.y], LINK_GAP);
                for (var j = 0; j < _links.length; j++) {
                    _links[j]['path'] = [
                        { x: multiLink.source.x, y: multiLink.source.y },
                        { x: multiLink.source.x + offset2[0] + (j - _links.length / 2 + .5) * offset[0],
                            y: (multiLink.source.y + offset2[1] + (j - _links.length / 2 + .5) * offset[1]) },
                        { x: multiLink.target.x - offset2[0] + (j - _links.length / 2 + .5) * offset[0],
                            y: (multiLink.target.y - offset2[1] + (j - _links.length / 2 + .5) * offset[1]) },
                        { x: multiLink.target.x, y: multiLink.target.y }
                    ];
                }
            }
        }
    }
}
function stretchVector(vec, finalLength) {
    var len = 0;
    for (var i = 0; i < vec.length; i++) {
        len += Math.pow(vec[i], 2);
    }
    len = Math.sqrt(len);
    for (var i = 0; i < vec.length; i++) {
        vec[i] = vec[i] / len * finalLength;
    }
    return vec;
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
export {drawNodeLink, debug, getNodeRadius, getLineStroke, getNodeColor}
