import * as DataHandler from './dataHandler.js'
import * as Timeline from './timelineView.js'
import * as Kde from './kdeView.js'

let CANVAS_HEIGHT, CANVAS_WIDTH, SVGHEIGHT, SVGWIDTH, SVGheight, SVGwidth, ZOOM_SLIDER_HEIGHT, STATIC_SLIDER_HEIGHT, svgHeight
export let WIDTH_RIGHT, WIDTH_MIDDLE, WIDTH_LEFT
let CANVAS, VIEW
let TIPS_CONFIG = { month: 'short', day: 'numeric' }
let data
let dg
let measureName = ['nodeNumber', 'linkNumber', 'linkPairNumber', 'density', 'activation', 'redundancy', 'volatility', 'component']
export let BANDWIDTH = 0.5
const RATIO_LEFT = 0.13, RATIO_MIDDLE = 0.83, RATIO_RIGHT = 0.04
const GRANULARITY_NAME = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'year', 'year', 'year']
const GRANULARITY_name = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'decade', 'century', 'millennium']
const GRANULARITY_CONFIG = ['numeric', 'numeric', 'numeric', 'numeric', '2-digit', 'short', 'short', 'numeric', 'numeric', 'numeric', 'numeric']
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*30*12*10, 1000*60*60*24*30*12*100, 1000*60*60*24*30*12*1000]
let timeLineColor = new Array(12).fill('gray')
let timeLineColor2 = ['orange','darkgreen', 'teal', 'blue','purple', 'red', 'crimson', 'coral', 'fuchisia']
let xScale, kdeScale, timeStamp, mainScale, mainKDEscale, brush, tooltipTitle
let MEASURE_DIV_ID
let CANVAS_INFO = []
const ELEMENTS = 8
const MARGIN = {
  'top': 3,
  'left': 5,
  'right': 5,
  'bottom': 10
}
const rectPadding = 0.5, scatterRadius = 2

let setCanvasParameters = function (divId, dgraph) {
  d3.select(`#${divId}`).select('svg').remove()
  MEASURE_DIV_ID = divId
  CANVAS_HEIGHT = $(`#${divId}`).innerHeight()
  CANVAS_WIDTH = Math.floor($(`#${divId}`).innerWidth())
  CANVAS = d3.select(`#${divId}`)
    .append('svg')
    .attr('height', CANVAS_HEIGHT)
    .attr('width', CANVAS_WIDTH)
  WIDTH_LEFT = CANVAS_WIDTH * RATIO_LEFT
  WIDTH_MIDDLE = CANVAS_WIDTH * RATIO_MIDDLE
  WIDTH_RIGHT = CANVAS_WIDTH* RATIO_RIGHT
  STATIC_SLIDER_HEIGHT = 0.08 * CANVAS_HEIGHT
  ZOOM_SLIDER_HEIGHT = 0.08 * CANVAS_HEIGHT
  SVGHEIGHT = Math.max((CANVAS_HEIGHT - ZOOM_SLIDER_HEIGHT - STATIC_SLIDER_HEIGHT) / ELEMENTS, 50)
  SVGWIDTH = CANVAS_WIDTH
  SVGheight = (SVGHEIGHT - MARGIN.top - MARGIN.bottom)
  SVGwidth = SVGWIDTH - MARGIN.left - MARGIN.right
  svgHeight = SVGheight
  VIEW = CANVAS.append('g').attr('transform', `translate(0, ${ZOOM_SLIDER_HEIGHT + STATIC_SLIDER_HEIGHT})`)
  brush = d3.brushX()
      .extent([[0,0], [WIDTH_MIDDLE, Math.floor(ZOOM_SLIDER_HEIGHT / 5)]])
      .on('brush end', brushed)
      .on('end', brushendCallback)
  xScale = d3.scaleTime()
      .range([0, WIDTH_MIDDLE])
      .domain([dgraph.roundedStart, dgraph.roundedEnd])
  mainScale = xScale.copy()
  if (dgraph.gran_min < 3) {
    TIPS_CONFIG['hour'] = 'numeric'
  }
  if (dgraph.gran_min > 3) {
    TIPS_CONFIG['year'] = 'numeric'
  }
  dg = dgraph
}

export let drawMeasureList = function (divId, subGraph = networkcube.getDynamicGraph()) {
  let dgraph = subGraph
  setCanvasParameters(divId, dgraph)
  data = Timeline.getData(dgraph)
  timeStamp = DataHandler.getTimeStamp(dgraph)
  let startTime = dgraph.timeArrays.momentTime[0]._i
  let scaleStart =  (dgraph.roundedStart - startTime) / dgraph.timeDelta
  let scaleEnd = (dgraph.roundedEnd - startTime) / dgraph.timeDelta
  mainKDEscale = d3.scaleLinear().range([0, WIDTH_MIDDLE]).domain([scaleStart, scaleEnd])
  kdeScale = mainKDEscale.copy()
  addGlobalInteraction()
  addMeasureWindow(dgraph)
  tooltipTitle = d3.select('body').append('div').classed('tooltip', true).style('opacity', 0).style('width', '18vh').style('text-align', 'left')
  networkcube.addEventListener('bandwidth', function (m) {
    BANDWIDTH = m.body
    drawKDEsummary()
    if (dg.selection.length > 0) {
      CANVAS_INFO.forEach((vis) => {
         let g =  vis.g
         let id = vis.item
         let color = dg.selection[id].color
         if(dg.selection.length === 1) color = "gray"
         let index = vis.index
         let summary = dg.selection[id].dotList[index][0]['dots'].map(v => v.y)
         let lineGenerator = drawKdeLine(g, color, summary)
         vis.lineGenerator = lineGenerator
      })
  }
  else {
    measureName.forEach((name, i) => {
        let summary = data[name][0].dots.map(v => v.y)
        let g = d3.select(`.vis_${i}`).select('.zoom-layer')
        let lineGenerator = drawKdeLine(g, 'gray', summary)
        CANVAS_INFO[i].lineGenerator = lineGenerator
      })
    }
  })
}

let addMeasureWindow = function (dgraph) {
  let data = Timeline.getData(dgraph)
  drawMeasure('Connected Nodes', data.nodeNumber, 'nodeNumber', 0, 'The number of nodes having connections to others.')
  drawMeasure('Active Links', data.linkNumber, 'linkNumber', 1, 'The number of active links.')
  drawMeasure('Active Link Pairs', data.linkPairNumber, 'linkPairNumber', 2, 'The number of active link pairs (dropped duplicates).')
  drawMeasure('Density', data.density, 'density', 3, 'The ratio of the number of active node pairs and the number of possible node pairs (every node counts).')
  drawMeasure('Activation', data.activation, 'activation', 4, 'The number of activated nodes from the beginning till current period, which at least connects to others once.')
  drawMeasure('Redundancy', data.redundancy, 'redundancy', 5, 'The number of the overlapped nodes between the previous period and current period.')
  drawMeasure('Volatility', data.volatility, 'volatility', 6, 'The number of changing link pairs between the previous period and current period.')
  drawMeasure('Connected Component', data.component, 'component', 7, 'The number of connected components.')

}

let addTimeline = function () {
  let g = CANVAS.append('g')
    .attr('id', 'strokeTimeline')
    .attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, ${ZOOM_SLIDER_HEIGHT+ STATIC_SLIDER_HEIGHT})`)
    .append('g')
    .style('visibility', 'hidden')
  let line = g.append('line').attr('id', 'hintline')
    .attr('x0', 0)
    .attr('x1', 0)
    .attr('y0', - 2 * ZOOM_SLIDER_HEIGHT / 5)
    .attr('y1', CANVAS_HEIGHT- ZOOM_SLIDER_HEIGHT - STATIC_SLIDER_HEIGHT)
    .style('stroke-linecap', 'round')
    .style('stroke-dasharray', '5,5')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .style('opacity', 0.5)
  g.append('rect')
   .style('fill', 'white')
   .attr('x', 0)
   .attr('y', - 3* ZOOM_SLIDER_HEIGHT / 5 - 5)
   .attr('height', '1.5rem')
   .attr('width', '6rem')
   .attr('rx', '0.3rem')
   .attr('ry', '0.3rem')
  g.append('text')
   .text('hint')
   .style('font-size', '0.85rem')
   .style('fill', 'gray')
   .style('font-family', 'cursive')
   .style('text-anchor', 'middle')
   .attr('y', - 3*  ZOOM_SLIDER_HEIGHT / 5 + 6)
  d3.selectAll('.hint')
   .on('mousemove', function () {
     let x = d3.mouse(this)[0]
     if (x < 0 || x > WIDTH_MIDDLE) {
       g.style('visibility', 'hidden')
       return
     }
     g.style('visibility', 'visible')
     let date = xScale.invert(x)
     let content = date.toLocaleDateString("en-US", TIPS_CONFIG)
     line.attr('x2', x)
         .attr('x1', x)
     g.select('rect')
       .attr('x', x - 45)
     g.select('text')
      .attr('x', x+5)
       .text(content)
   })
}

let globalZoom = function () {
  xScale = d3.event.transform.rescaleX(mainScale)
  kdeScale = d3.event.transform.rescaleX(mainKDEscale)
  if (d3.event.transform.k === 1) {
    xScale = mainScale.copy()
    kdeScale = mainKDEscale.copy()
  }
  let div = d3.select(`#${MEASURE_DIV_ID}`)
  div.selectAll('.x-axis').call(d3.axisBottom(xScale).ticks(4)).selectAll(".tick text").remove()//.style('fill', 'gray')
  div.selectAll('.bars').attr('x', d => xScale(d.timeStart)).attr('width', d => {
    let value = (xScale(d.timeEnd) - xScale(d.timeStart)) - rectPadding
    return Math.max(value, 1)
  })
  CANVAS_INFO.forEach(vis => {
    vis.g.selectAll('.kdeLine').selectAll('path').attr('d', d => vis.lineGenerator.x(d => kdeScale(d.x))(d))
  })
  div.select('.zoom-timeline').call(d3.axisBottom(xScale).ticks(6))
  let currentRange = xScale.domain()
  div.select('.brush-g').call(brush.move, [xScale(window.activeTime.start), xScale(window.activeTime.end)])
  div.select('#currentPeriod').attr('x', mainScale(currentRange[0])).attr('width', mainScale(currentRange[1]) - mainScale(currentRange[0]))
  div.select('#startTimeCurve').datum([[mainScale(currentRange[0]), 0], [mainScale(currentRange[0]), STATIC_SLIDER_HEIGHT / 6], [0, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]]).attr('d', periodLineGenerator)
  div.select('#endTimeCurve').datum([[mainScale(currentRange[1]), 0], [mainScale(currentRange[1]), STATIC_SLIDER_HEIGHT / 6], [WIDTH_MIDDLE, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]]).attr('d', periodLineGenerator)
}

let brushendCallback = function (d) {
    let selection = d3.event.selection || xScale.range()
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    // networkcube.sendMessage('period', {'start': brushStart.getTime(), 'end': brushEnd.getTime()})  // for group Measures
    let interval = window.activeTime.endId - window.activeTime.startId
    if (interval < 0) {
      CANVAS_INFO.forEach(vis => {
        let g = vis.g.select('.brush-result')
        g.style('visibility', 'hidden')
      })
      return
    }
    let periodData = {}
    if (dg.selection.length==0) {
     periodData[0] = Timeline.getIntervalData(dg, window.activeTime.startId, window.activeTime.endId)
    }
    else {
      dg.selection.forEach(v => {
        let data = Timeline.getIntervalData(v.dgraph, window.activeTime.startId, window.activeTime.endId)
        periodData[v.id] = data
        console.log(v.id, data, v.dgraph)
      })
    }
    CANVAS_INFO.forEach(vis => {
      let content = vis.index
      let item  = vis.item
      let g = vis.g.select('.brush-result')
      g.style('visibility', 'visible')
      g.select('rect')
        .attr('x', xScale(brushStart))
        .attr('y', vis.yScale(periodData[item][content]))
        .attr('height', vis.yScale(0) - vis.yScale(periodData[item][content]))
        .attr('width', xScale(brushEnd) - xScale(brushStart))
      g.select('text')
        .attr('x', (xScale(brushStart) + xScale(brushEnd))/2)
        .attr('y', vis.yScale(periodData[item][content]))
        .text(`${Number(periodData[item][content]).toFixed(2)}`)
    })

  }

let brushed = function () {
    let selection = d3.event.selection || xScale.range()
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    let dg = networkcube.getDynamicGraph()
    let start = brushStart.getTime()
    let end = brushEnd.getTime()
    let startId = binarySearch(dg.timeArrays.unixTime, d => d >= start)
    let endId = Math.max(0, binarySearch(dg.timeArrays.unixTime, d => d >= end)-1)
    endId = Math.min(endId, dg.timeArrays.unixTime.length - 1)
    window.activeTime = {startId: startId, endId: endId, startUnix: start, endUnix: end, start: brushStart, end: brushEnd}
    d3.select('#timeStartText')
      .classed('annotation', true)
      .text(brushStart.toLocaleDateString("en-US", TIPS_CONFIG))
      .attr('transform', 'translate('+ selection[0] + ', 0)')

    d3.select('#timeEndText')
      .classed('annotation', true)
      .text(brushEnd.toLocaleDateString("en-US", TIPS_CONFIG))
      .attr('transform', 'translate('+ selection[1] + ', 0)')

    d3.select('#brushPeriod')
      .attr('x', mainScale(brushStart))
      .attr('width', mainScale(brushEnd) - mainScale(brushStart))

    networkcube.timeRange(brushStart.getTime(), brushEnd.getTime(), true)
    networkcube.sendMessage('timerange', {startUnix: brushStart.getTime(), endUnix: brushEnd.getTime() })

  }

let moveHandle = function (m) {
  let msg = m.body
  let start = new Date(msg.timeStart)
  let end = new Date(msg.timeEnd)
  let dg = networkcube.getDynamicGraph()
  let startId = binarySearch(dg.timeArrays.unixTime, d => d >= msg.timeStart)
  let endId = binarySearch(dg.timeArrays.unixTime, d => d >= msg.timeEnd)
  endId = Math.min(endId, dg.timeArrays.unixTime.length - 1)
  window.activeTime = {startId: startId, endId: endId, startUnix: msg.timeEnd, endUnix: msg.timeStart, start: start, end: end}
  d3.select('.brush-g').call(brush.move, [xScale(start), xScale(end)])
}

let periodLineGenerator =  d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom)

let drawKDEsummary = function () {
  let staticG = d3.select('#KDEsummary')
  staticG.select('.kdeLine').remove()
  let summary = timeStamp.map(v => 1)
  let density = Kde.kde(Kde.epanechinikov(BANDWIDTH), kdeScale.ticks(200), summary , timeStamp)
  let kdeYScale = d3.scaleLinear()
    .domain([0, d3.max(density.map(v => v.y))])
    .range([ STATIC_SLIDER_HEIGHT / 3 - 4, 0])
  let line = d3.line()
      .curve(d3.curveCardinal)
      .x(d => kdeScale(d.x))
      .y(d => kdeYScale(d.y))
  staticG
    .append('path')
    .classed('kdeLine', true)
    .datum(density)
    .style('fill', 'none')
    .style('stroke', 'gray')
    .style('stroke-opacity' , 0.7)
    .style('stroke-width', 1.5)
    .style('stroke-linejoin', 'round')
    .attr('d', line)
}

let addTimeSlider = function () {
  let staticG = CANVAS.append('g')
    .classed('timeslider', true)
    .attr('id', 'KDEsummary')
    .attr('transform', `translate(${MARGIN.left + WIDTH_LEFT}, 0)`)
  drawKDEsummary(staticG)
  let staticTimelineG = staticG.append('g')
    .attr('transform', `translate(0, ${ 2*STATIC_SLIDER_HEIGHT / 3})`)

  staticTimelineG.append('g')
    .selectAll('.snapshot')
     .data(window.dgraph.timeArrays.momentTime)
     .enter()
     .append('line')
     .style('stroke', '#E2E6EA')
     .classed('snapshot', true)
     .attr('x1', d => mainScale(d._d))
     .attr('x2', d => mainScale(d._d))
     .attr('y1', 0)
     .attr('y2', -STATIC_SLIDER_HEIGHT / 3)

  staticTimelineG.call(d3.axisTop(mainScale).ticks(6))

  let rangeG = staticTimelineG.append('g')
  rangeG.append('rect')
    .style('fill', 'lightgray')
    .style('opacity', 0.3)
    .attr('id', 'currentPeriod')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', STATIC_SLIDER_HEIGHT / 6)
    .attr('width', WIDTH_MIDDLE)

  rangeG.append('rect')
    .style('fill', '#D6D6D6')
    .style('opacity', 1)
    .attr('id', 'brushPeriod')
    .attr('x', 0)
    .attr('y', 1)
    .attr('height', STATIC_SLIDER_HEIGHT / 6)
    .attr('width', WIDTH_MIDDLE)

  rangeG.append('path')
    .datum([[0, 0], [0, STATIC_SLIDER_HEIGHT / 6], [0, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]])
    .attr('id', 'startTimeCurve')
    .style('fill', 'none')
    .style('stroke', 'lightgray')
    .style('stroke-width', 4)
    .style('storke-linecap', 'round')
    .style('stroke-opacity', 0.3)
    .attr('d', periodLineGenerator)

  rangeG.append('path')
    .attr('id', 'endTimeCurve')
    .datum([[WIDTH_MIDDLE, 0], [WIDTH_MIDDLE, STATIC_SLIDER_HEIGHT / 6], [WIDTH_MIDDLE, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]])
    .style('fill', 'none')
    .style('stroke', 'lightgray')
    .style('stroke-width', 4)
    .style('stroke-opacity', 0.3)
    .style('stroke-linecap', 'round')
    .attr('d', periodLineGenerator)

  let sliderG = CANVAS.append('g')
    .attr('transform', `translate(${MARGIN.left + WIDTH_LEFT}, ${STATIC_SLIDER_HEIGHT + ZOOM_SLIDER_HEIGHT / 5})`)
  sliderG.append('g')
    .append('line')
    .attr('id', 'hintline')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 0)
    .style('stroke-linecap', 'round')

  sliderG.append('g')
     .classed('zoom-timeline', true)
     .classed('timeslider', true)
     .call(d3.axisBottom(xScale).ticks(6))

  let brushG = sliderG
    .append('g')
    .attr('transform', `translate(0,${- ZOOM_SLIDER_HEIGHT / 5 - 2})`)
    .classed('brush-g', true)
    .call(brush)
    .call(brush.move, xScale.range())

  let textLayer = sliderG.append('g')
    .attr('transform', `translate(0, ${- 5})`)
    .style('font-family', 'cursive')
  textLayer.append('text')
     .attr('id', 'timeEndText')
     .style('fill', 'gray')
     .style('text-anchor', 'start')

  textLayer.append('text')
     .attr('id', 'timeStartText')
     .style('fill', 'gray')
     .style('text-anchor', 'end')
}

let addGlobalInteraction = function () {
  networkcube.addEventListener('focusPeriod', moveHandle)
  let zoom = d3.zoom()
  .scaleExtent([1, 50])
  .translateExtent([[10,0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .extent([[0, 0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .on('zoom', globalZoom)
  VIEW.append('rect')
     .attr('transform', `translate(${WIDTH_LEFT + MARGIN.left}, 0)`)
     .classed('hint', true)
     .attr('x', -10)
     .attr('y', 0)
     .attr('height', CANVAS_HEIGHT - ZOOM_SLIDER_HEIGHT - STATIC_SLIDER_HEIGHT + 10)
     .attr('width', WIDTH_MIDDLE + 20)
     .style('opacity', 0)
     .style('pointer-events', 'all')
     .call(zoom)

  addTimeSlider()
  addTimeline()
}

let drawMeasure = function (title, dataList, id, idx, description = '') {
  let svg = VIEW.append('g')
    .classed('measureView', true)
    .attr('transform', `translate(0, ${idx * SVGHEIGHT})`)
    .classed(`timeline-${idx}`, true)
    .attr('timeline-id', idx)
  drawTitle(svg, title, description)
  comparisonMeasureOvertime(svg, dataList, idx, id)
  drawIcons(svg, idx)
}

let comparisonMeasureOvertime = function (svg, dataList, idx, id) {
  if(dg.selection.length === 0) {
    drawMeasureOvertime(svg, dataList, idx, id)
    return
  }
  let len = dg.selection.length
  svgHeight = SVGheight / len
  for (let i = 0; i < len; i++) {
    let g = svg.append('g').attr('transform', `translate(${0}, ${svgHeight * i})`)
    let dotList = dg.selection[i].dotList[id]
    let maxY =  d3.max(dotList.map(dots => d3.max(dots.dots.map(v => v.y))))
    let color = dg.selection[i].color
    let index = dg.selection[i].id
    if(len===1) color="gray"
    drawMeasureOvertime(g, dotList, idx, id, index, color, maxY)
  }
}

let drawMeasureOvertime = function (svg, dotList, idx, id, item = 0, color = "gray", maxY = 0) {
  if(maxY===0) {
    maxY = d3.max(dotList.map(dots => d3.max(dots.dots.map(v => v.y))))
  }
  let yScale = d3.scaleLinear()
    .range([svgHeight, svgHeight / 6])
    .domain([0, maxY])
    .nice()
  let g = svg.append('g')
    .attr('transform', `translate(${MARGIN.left + WIDTH_LEFT}, ${MARGIN.top})`)
    .classed(`vis_${idx}`, true)
    .classed('mini_vis', true)
  g.append('defs')
    .append('SVG:clipPath')
    .attr('id', `clip_${item}_${idx}`)
    .append('SVG:rect')
    .attr('width', WIDTH_MIDDLE)
    .attr('height', svgHeight + svgHeight / 6 + 5)
    .attr('x', 0)
    .attr('y', -svgHeight / 6 - 5)
  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${svgHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll(".tick text")
    .remove()
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(2))
  let tooltip = g.append('text')
     .attr('class', 'tooltip')
     .style('opacity', 0)
     .style('text-anchor', 'middle')
     .style('font-size', )
  let timeTooltip = g.append('text')
    .attr('class', 'timeTooltip')
    .style('opacity', 0)
    .style('text-anchor', 'middle')
  let zoomLayer = g.append('g').attr('clip-path', `url(#clip_${item}_${idx})`).classed('zoom-layer', true)
  let summary = dotList[0].dots.map(v => v.y)
  let lineGenerator = drawKdeLine(zoomLayer, color , summary)
  dotList.reverse().forEach((res, i) => {
    let data = res.dots
    zoomLayer.append('g')
      .classed(`level_${i}`, true)
      .selectAll('.bars')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', (d, no) => `rank_${no} bars`)
      .attr('x', d => xScale(d.timeStart))
      .attr('y', d => yScale(d.y))
      .attr('width', d => {
        let value = (xScale(d.timeEnd) - xScale(d.timeStart))
        if (i === 0) value -= rectPadding * 2
        if (i === 1) value -= rectPadding
        if (i > 1) value *= 1.5
        return Math.max(value, 1)
      })
      .attr('data', d => d.y)
      .attr('height', d => yScale(0) - yScale(d.y))
      .style('fill', color)
      .style('opacity', i / dotList.length + 1 / dotList.length)
      .style('stroke-width', Math.log(i*10))
      .on('mouseover', function (d, no) {
        let self = d3.select(this)
        d3.select(this).style('stroke', 'yellow').style('stroke-width', 3)
        let newX =  parseFloat(self.attr('x')) + parseFloat(self.attr('width')) / 2
        let newY =  parseFloat(self.attr('y')) - 20
        let value = d.y.toFixed(2)
        timeTooltip
          .attr('x', newX)
          .attr('y', newY - 13)
          .attr('dy', '1rem')
          .text(getTimeString(d.timeStart, d.timeEnd))
          .style('fill', 'black')
          .style('opacity', 1)
        d3.selectAll(`.mini_vis`)
          .each(function(d) {
            let ele = d3.select(this).select(`.level_${i}`).select(`.rank_${no}`)
            let y =  parseFloat(ele.attr('y')) - 5
            let data = ele.datum()
            d3.select(this)
             .select('.tooltip')
             .text(d => data.y.toFixed(2))
             .attr('x', newX)
             .attr('y', y)
             .style('fill', 'black')
             .style('opacity', 1)
          })
      })
      .on('mouseout', function (d, no) {
        let tooltips = d3.selectAll(`.tooltip`)
       tooltips.style('opacity', 0)
       tooltips.text('')
       timeTooltip.style('opacity', 0)
       timeTooltip.selectAll('tspan').remove()
        d3.select(this).style('stroke', '')
      })
      .on('click', function (d) {
        networkcube.sendMessage('focusPeriod', d)
      })

    // zoomLayer.append('g')
    //  .classed(`dots_${i}`, true)
    //  .selectAll('circle')
    //  .data(data)
    //  .enter()
    //  .append('circle')
    //  .attr('cx', d => xScale(d.timeStart))
    //  .attr('cy', d => yScale(d.y))
    //  .attr('r', scatterRadius)
    //  .style('fill', timeLineColor[idx])
    //  .style('display', 'none')
    //  .style('opacity', i / dotList.length + 1 / dotList.length)
  })
  dotList.reverse()
  let instantG = zoomLayer.append('g')
    .classed('brush-result', true)
  instantG.append('defs')
    .html(`	<pattern id="pattern_${item}_${idx}" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"> 	<line x1="0" y="0" x2="0" y2="5" stroke="${color}" stroke-width="6" />	</pattern>`)
  instantG.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', 0)
    .attr('width', 0)
    .style('fill', `url(#pattern_${item}_${idx})`)
    .style('opacity', 0.8)
  instantG.append('text')
    .style('fill', 'black')
    .style('text-anchor', 'middle')
    .style('font-size', '0.9rem')
    .style('stroke', 'white')
    .style('stroke-width', 0.08)
    .text('')

  CANVAS_INFO.push(new MeasureVis(zoomLayer, lineGenerator, yScale, id, item))
}

class MeasureVis {
  constructor (g, lineGenerator, yScale, index, item) {
    this.g = g  // zoom-layer
    this.lineGenerator = lineGenerator  // kdeline
    this.yScale = yScale  // bar chart scale
    this.index = index  // index
    this.item = item  // selection id
  }
}

let drawKdeLine = function (g, color, summary) {
  let density = Kde.kde(Kde.epanechinikov(BANDWIDTH), kdeScale.ticks(400), summary, timeStamp)
  g.select(`.kdeLine`).remove()
  let kdeYScale = d3.scaleLinear()
    .domain([0, d3.max(density.map(v => v.y))])
    .range([SVGheight / 6, -SVGheight / 6])
  let line = d3.line()
      .curve(d3.curveCardinal)
      .x(d => kdeScale(d.x))
      .y(d => kdeYScale(d.y))
  g.append('g')
    .classed('kdeLine', true)
    .append('path')
    .datum(density)
    .style('fill', 'none')
    .style('stroke', color)
    .style('stroke-width', 1.5)
    .style('stroke-linejoin', 'round')
    .attr('d', line)
  return line
}

let drawIcons = function (svg, idx) {
  let g = svg.append('g')
    .attr('transform', `translate(${WIDTH_LEFT + WIDTH_MIDDLE}, ${MARGIN.top})`)
  let data = [{
    text: '\uf062',
    callback: function () {
      let id = Number(svg.attr('timeline-id'))
      if(id === 0) return
      d3.select(`.timeline-${id - 1}`).attr('timeline-id', id).attr('transform', `translate(0, ${id * SVGHEIGHT})`).classed(`timeline-${id}`, true).classed(`timeline-${id-1}`, false)
      svg.attr('timeline-id', id - 1).attr('timeline-id', id - 1).attr('transform', `translate(0, ${(id-1) * SVGHEIGHT})`).classed(`timeline-${id-1}`, true).classed(`timeline-${id}`, false)
    }
  } ,  {
    text: '\uf06e',
    toggle: 1,
    callback: function (element) {
      let ele = d3.select(element)
      console.log(ele)
      let toggle = Number(ele.attr('toggle'))
      if (toggle) {
        ele.text('\uf070')
        ele.attr('toggle', 0)
        svg.selectAll('.kdeLine').style('display', 'none')
        return
      }
      ele.text('\uf06e')
      ele.attr('toggle', 1)
      svg.selectAll('.kdeLine').style('display', '')
    }
  }, {
    text: '\uf063',
    callback: function () {
      let id = Number(svg.attr('timeline-id'))
      if(id === ELEMENTS - 1) return
      d3.select(`.timeline-${id + 1}`).attr('timeline-id', id).attr('transform', `translate(0, ${(id) * SVGHEIGHT})`).classed(`timeline-${id}`, true).classed(`timeline-${id + 1}`, false)
      svg.attr('timeline-id', id + 1).attr('transform', `translate(0, ${(id + 1) * SVGHEIGHT})`).classed(`timeline-${id+1}`, true).classed(`timeline-${id}`, false)
    }
  }]
  g.selectAll('text')
   .data(data)
   .enter()
   .append('text')
   .classed('icon', true)
   .classed('fas', true)
   .attr('x', MARGIN.left)
   .attr('y', (d, i) => 15 * i + 15)
   .attr('toggle', d => d.toggle)
   .style('font-family', 'Font Awesome 5 Free')
   .style('font-weight', 900)
   .style('font-size', '0.8rem')
   .style('fill', timeLineColor[idx])
   .style('opacity', 0.5)
   .style('cursor', 'pointer')
   .text( d => d.text)
   .on('click', function(d) {
     let self = this
     d.callback(self)
   })
}

let drawTitle = function (svg, title, description) {
  let g = svg.append('g')
  let x = MARGIN.left
  let y = MARGIN.top
  let width = WIDTH_LEFT * 0.5
  let text = g.append('text')
   .classed('measureTitle', true)
   .attr('x', x)
   .attr('y', y)
   .style('font-size', '0.9rem')
   .attr('dy', '0.5rem')
   .text(title)
 let words = title.split(/\s+/).reverse(),
   word,
   line = [],
   lineNumber = 0,
   lineHeight = 1.1,
   dy = parseFloat(text.attr('dy')),
   tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em')
  while (word = words.pop()) {
   line.push(word)
   tspan.text(line.join(' '))
   if (tspan.node().getComputedTextLength() > width) {
     line.pop()
     tspan.text(line.join(' '))
     line = [word]
     tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word)
   }
  }
  text.append('tspan')
   .attr('x', tspan.node().getComputedTextLength() + 2)
   .attr('y', y)
   .attr('dy', (lineNumber) * lineHeight + dy + 'em')
   .classed('icon', true)
   .classed('fas', true)
   .style('font-family', 'Font Awesome 5 Free')
   .style('font-weight', 900)
   .style('font-size', '0.8rem')
   .style('fill', 'gray')
   .style('cursor', 'pointer')
  .text('\uf059')
  .on('mouseover', function () {
    tooltipTitle.transition()
      .duration(200)
      .style('opacity', 1)
    tooltipTitle.html(description)
      .style('left', (d3.event.pageX + 20) + 'px')
      .style('top', (d3.event.pageY - 28) + 'px')
  })
  .on('mouseout', function () {
    tooltipTitle.transition()
      .duration(500)
      .style('opacity', 0)
  })

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
function getTimeString (timeStart, timeEnd) {
  let interval = timeEnd.getTime() - timeStart.getTime()
  let granularity = 0
  for (let i in timeList) {
    if (timeList[i] > interval) {
      granularity = Math.max(0, i - 1)
      break
    }
  }
  let options = {}
  options[GRANULARITY_NAME[granularity]] = GRANULARITY_CONFIG[granularity]
  return GRANULARITY_name[granularity].capitalize() + ': ' + timeStart.toLocaleDateString("en-US", options) + ' ~ ' + timeEnd.toLocaleDateString("en-US", options)
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
