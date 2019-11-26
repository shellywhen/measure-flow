import * as DataHandler from './dataHandler.js'
import * as Timeline from './timelineView.js'
import * as Kde from './kdeView.js'
import * as Calculator from './measureCalculator.js'
import * as Constant from './constant.js'

let CANVAS_HEIGHT, CANVAS_WIDTH, SVGHEIGHT, SVGWIDTH, SVGheight, SVGwidth, ZOOM_SLIDER_HEIGHT, STATIC_SLIDER_HEIGHT, svgHeight
export let WIDTH_RIGHT, WIDTH_MIDDLE, WIDTH_LEFT
let ACTIVE_MEASURE_INDEX = 0
let CANVAS, VIEW
let TIPS_CONFIG = { month: 'short', day: 'numeric' }
let data
let dg, timeslider
let measureName = ['nodeNumber', 'linkNumber', 'linkPairNumber', 'density', 'activation', 'redundancy', 'volatility', 'component']
export let BANDWIDTH = 0.5
const RATIO_LEFT = 0.13, RATIO_MIDDLE = 0.83, RATIO_RIGHT = 0.04
const GRANULARITY_NAME = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'year', 'year', 'year']
const GRANULARITY_name = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'decade', 'century', 'millennium']
const GRANULARITY_names = ['miliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years', 'decades', 'centuries', 'millenniums']
const GRANULARITY_CONFIG = ['numeric', 'numeric', 'numeric', 'numeric', '2-digit', 'short', 'short', 'numeric', 'numeric', 'numeric', 'numeric']
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*30*12*10, 1000*60*60*24*30*12*100, 1000*60*60*24*30*12*1000]
let timeLineColor = new Array(20).fill('gray')
let timeLineColor2 = ['orange','darkgreen', 'teal', 'blue','purple', 'red', 'crimson', 'coral', 'fuchisia']
let xScale, kdeScale, timeStamp, mainScale, mainKDEscale, brush, tooltipTitle, zoom, MINI_YMAX = 0
let MEASURE_DIV_ID
let CANVAS_INFO = [], FRAME_INFO = []
const ELEMENTS = 8
const MARGIN = {
  'top': 10,
  'left': 5,
  'right': 5,
  'bottom': 10
}
const rectPadding = 0.5, scatterRadius = 2

let globalZoom = function () {
  xScale = d3.event.transform.rescaleX(mainScale)
  kdeScale = d3.event.transform.rescaleX(mainKDEscale)
  if (d3.event.transform.k === 1) {
    xScale = mainScale.copy()
    kdeScale = mainKDEscale.copy()
  }
  let outer = d3.select('#outer-measureFrame')
  let div = d3.selectAll(`.frame`)
  div.selectAll('.x-axis').call(d3.axisBottom(xScale).ticks(4)).selectAll('.tick text').remove()//.style('fill', 'gray')
  div.selectAll('.bars').attr('x', d => xScale(d.timeStart)).attr('width', d => {
    let value = (xScale(d.timeEnd) - xScale(d.timeStart)) - rectPadding
    return Math.max(value, 1)
  })
  d3.selectAll('.interval-bars')
    .attr('x', d => xScale(d.x1))
  // CANVAS_INFO.forEach(vis => {
  //   vis.g.selectAll('.kdeLine').selectAll('path').attr('d', d => vis.lineGenerator.x(d => kdeScale(d.x))(d))
  // })
  FRAME_INFO.forEach(frame => {
    frame.canvas.selectAll('.kdeLine').each(function(d, i) {
      d3.select(this).select('path').attr('d', d => frame.lineGenerator[i].x(d => kdeScale(d.x))(d))
    })
  })
  outer.select('.zoom-timeline').call(d3.axisBottom(xScale).ticks(6))
  let currentRange = xScale.domain()
  window.activeTime.start = xScale.domain()[0]
  window.activeTime.end = xScale.domain() [1]
  let xRange = xScale.range()
  let tmpRange = [xRange[0], xRange[0]]
  outer.select('.brush-g').call(brush.move, tmpRange) // hidden
  outer.select('#currentPeriod').attr('x', mainScale(tmpRange[0])).attr('width', mainScale(tmpRange[1]) - mainScale(tmpRange[0]))
  outer.select('#startTimeCurve').datum([[mainScale(currentRange[0]), 0], [mainScale(currentRange[0]), STATIC_SLIDER_HEIGHT / 6], [0, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]]).attr('d', periodLineGenerator)
  outer.select('#endTimeCurve').datum([[mainScale(currentRange[1]), 0], [mainScale(currentRange[1]), STATIC_SLIDER_HEIGHT / 6], [WIDTH_MIDDLE, STATIC_SLIDER_HEIGHT / 6 + ZOOM_SLIDER_HEIGHT / 3]]).attr('d', periodLineGenerator)
}

let setCanvasParameters = function (divId, dgraph) {
  MEASURE_DIV_ID = divId
  CANVAS_INFO = []
  CANVAS_HEIGHT = $(`#${divId}`).innerHeight()
//  CANVAS_WIDTH = $(`#${divId}`).innerWidth()
  CANVAS_WIDTH = window.innerWidth * 0.63
  d3.select(`#${divId}`).select('svg').remove()
  CANVAS = d3.select(`#${divId}-haha`)
    .classed('measure-line-div', true)
    .append('svg')
    .attr('height', CANVAS_HEIGHT)
    .attr('width', CANVAS_WIDTH)
    .html(`<defs>
<filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="2 2" result="shadow"/>
<feOffset dx="6" dy="6"/>
</filter>
</defs>`)
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
  zoom = d3.zoom()
  .scaleExtent([1, 50])
  .translateExtent([[10,0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .extent([[0, 0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .on('zoom', globalZoom)
  if (dgraph.gran_min < 3) {
    TIPS_CONFIG['hour'] = 'numeric'
  }
  if (dgraph.gran_min > 3) {
    TIPS_CONFIG['year'] = 'numeric'
  }
  dg = dgraph
  tooltipTitle = d3.select('body').append('div').classed('tooltip', true).style('opacity', 0).style('width', '18vh').style('text-align', 'left')

  // data = Timeline.getData(dgraph)
  timeStamp = DataHandler.getTimeStamp(dgraph)
  let startTime = dgraph.timeArrays.momentTime[0]._i
  let scaleStart =  (dgraph.roundedStart - startTime) / dgraph.timeDelta
  let scaleEnd = (dgraph.roundedEnd - startTime) / dgraph.timeDelta
  mainKDEscale = d3.scaleLinear().range([0, WIDTH_MIDDLE]).domain([scaleStart, scaleEnd])
  kdeScale = mainKDEscale.copy()
}

export let drawMeasureList = function (divId, subGraph = networkcube.getDynamicGraph()) {
  let dgraph = subGraph
  setCanvasParameters(divId, dgraph)

  addGlobalInteraction()
  addMeasureWindow(dgraph)

  networkcube.addEventListener('bandwidth', function (m) {
    BANDWIDTH = m.body
    drawKDEsummary()
    if (dg.selection.length > 0) {
      CANVAS_INFO.forEach((vis) => {
         let g =  vis.g
         let id = vis.item
         let color = dg.selection[id].color
         if(dg.selection.length === 1) color = 'gray'
         let index = vis.index
         let summary = vis.dots.map(v => v.y)
      //   let summary = dg.selection[id].dotList[index][0]['dots'].map(v => v.y)
         let lineGenerator = drawKdeLine(g, color, summary)
         vis.lineGenerator = lineGenerator
      })
      return
    }
    CANVAS_INFO.forEach((vis) => {
        let summary = vis.dots.map(v => v.y)
        let g = vis.g
        let lineGenerator = drawKdeLine(g, 'gray', summary)
        vis.lineGenerator = lineGenerator
      })
  })
  drawTypeList('link')
  drawTypeList('node')
}

let addMeasureWindow = function (dgraph) {
  let data = Timeline.getData(dgraph)

  drawMeasure(VIEW, 'Connected Nodes', data.nodeNumber, 'nodeNumber', 0, 'The number of nodes having connections to others.')
  drawMeasure(VIEW, 'Active Links', data.linkNumber, 'linkNumber', 1, 'The number of active links.')
  drawMeasure(VIEW, 'Active Link Pairs', data.linkPairNumber, 'linkPairNumber', 2, 'The number of active link pairs (dropped duplicates).')
  drawMeasure(VIEW, 'Density', data.density, 'density', 3, 'The ratio of the number of active node pairs and the number of possible node pairs (every node counts).')
  drawMeasure(VIEW, 'Activation', data.activation, 'activation', 4, 'The number of activated nodes from the beginning till current period, which at least connects to others once.')
  drawMeasure(VIEW, 'Redundancy', data.redundancy, 'redundancy', 5, 'The number of the overlapped nodes between the previous period and current period.')
  drawMeasure(VIEW, 'Volatility', data.volatility, 'volatility', 6, 'The number of changing link pairs between the previous period and current period.')
  drawMeasure(VIEW, 'Connected Component', data.component, 'component', 7, 'The number of connected components.')

}
let changeKDE = function (m) {
    BANDWIDTH = m.body
    drawKDEsummary()
    FRAME_INFO.forEach(frame => {
      frame.canvas.selectAll('.zoom-layer').each(function(d, i) {
        let g = d3.select(this)
        let color = dg.selection.length < 2 ? 'gray' : dg.selection[i].color
        let lineGenerator = drawKdeLine(g, color, frame.data[i][0].dots.map(v => v.y))
        frame.lineGenerator[i] = lineGenerator
      })
    })
  //   if (dg.selection.length > 0) {
  //     CANVAS_INFO.forEach((vis) => {
  //        let g =  vis.g
  //        let id = vis.item
  //        let color = dg.selection[id].color
  //        if(dg.selection.length === 1) color = 'gray'
  //        let index = vis.index
  //        let summary = vis.dots.map(v => v.y)
  //     //   let summary = dg.selection[id].dotList[index][0]['dots'].map(v => v.y)
  //        let lineGenerator = drawKdeLine(g, color, summary)
  //        vis.lineGenerator = lineGenerator
  //     })
  //     return
  //   }
  //   CANVAS_INFO.forEach((vis) => {
  //       let summary = vis.dots.map(v => v.y)
  //       let g = vis.g
  //       let lineGenerator = drawKdeLine(g, 'gray', summary)
  //       vis.lineGenerator = lineGenerator
  //     })
  // })
}
let addTimeline = function () {
  let g = CANVAS.append('g')
    .attr('id', 'strokeTimeline')
    .classed('strokeTimeline', true)
    .attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, ${ZOOM_SLIDER_HEIGHT+ STATIC_SLIDER_HEIGHT})`)
    .append('g')
    .style('visibility', 'hidden')
  let line = g.append('line')
    .attr('id', 'hintline')
    .classed('vertical-hintline', true)
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
  VIEW.select('.hint')
   .on('mousemove', function () {
     let x = d3.mouse(this)[0]
     if (x < 0 || x > WIDTH_MIDDLE) {
       g.style('visibility', 'hidden')
       return
     }
     g.style('visibility', 'visible')
     let date = xScale.invert(x)
     let content = date.toLocaleDateString('en-US', TIPS_CONFIG)
     d3.select('#mainFrame')
        .selectAll('.vertical-hintline').attr('x2', x)
        .attr('x1', x)
     g.select('rect')
       .attr('x', x - 45)
     g.select('text')
      .attr('x', x+5)
       .text(content)
   })
}



let brushendCallback = function (d) {
    let selection = d3.event.selection || [0,0]
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    let interval = window.activeTime.endId - window.activeTime.startId
    if (interval < 0) {
      FRAME_INFO.forEach(frame => {
        let res = frame.canvas.selectAll('.brush-result').style('visibility', 'hidden')
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
      })
    }
    FRAME_INFO.forEach(frame => {
      let label = frame.dataLabel
      let res = frame.canvas.selectAll('.brush-result').style('visibility', 'visible')
      res.each(function (d, i) {
        let canvas = d3.select(this)
        let y = frame.yScale[i](periodData[i][label])
        let maxY = frame.yScale[i].range()[1]
        let text = Number(periodData[i][label])
        if ((maxY - y) / maxY > 0.1) {
          y = maxY * 0.95
          canvas.select('.overflow_rect')
            .attr('x', xScale(brushStart))
            .attr('y', 0)
            .attr('height', y)
            .attr('width', xScale(brushEnd) - xScale(brushStart))
        }
        else {
          canvas.select('.overflow_rect')
            .attr('height', 0)
        }
        canvas.select('.instance_rect')
          .attr('x', xScale(brushStart))
          .attr('y', y)
          .attr('height', frame.yScale[i](0) - y)
          .attr('width', xScale(brushEnd) - xScale(brushStart))
        canvas.select('text')
          .attr('x', (xScale(brushStart) + xScale(brushEnd))/2)
          .attr('y', y)
          .text(`${text % 1 == 0 ? text : text.toFixed(4)}`)
      })
    })
    // CANVAS_INFO.forEach(vis => {
    //   let content = vis.index
    //   let item  = vis.item
    //   let g = vis.g.select('.brush-result')
    //   g.style('visibility', 'visible')
    //   g.select('rect')
    //     .attr('x', xScale(brushStart))
    //     .attr('y', vis.yScale(periodData[item][content]))
    //     .attr('height', vis.yScale(0) - vis.yScale(periodData[item][content]))
    //     .attr('width', xScale(brushEnd) - xScale(brushStart))
    //   g.select('text')
    //     .attr('x', (xScale(brushStart) + xScale(brushEnd))/2)
    //     .attr('y', vis.yScale(periodData[item][content]))
    //     .text(`${Number(periodData[item][content]).toFixed(2)}`)
    // })

  }

let brushed = function () {
    let selection = d3.event.selection || xScale.range()
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    let dg = networkcube.getDynamicGraph()
    let start = brushStart.getTime()
    let end = brushEnd.getTime()
    // let startId = binarySearch(dg.timeArrays.unixTime, d => d >= start)
    // let endId = Math.max(0, binarySearch(dg.timeArrays.unixTime, d => d >= end)-1)
    // endId = Math.min(endId, dg.timeArrays.unixTime.length - 1)
    let startId = 0
    let endId = dg.timeArrays.unixTime.length - 1
    dg.timeArrays.unixTime.forEach((d, i) => {
        if(i!=0 && dg.timeArrays.unixTime[i-1] < start&&d>=start)
        startId = i
        if(i!=dg.timeArrays.unixTime.legth - 1&&dg.timeArrays.unixTime[i+1] > end && d <= end)
        endId = i
      })
    window.activeTime = {startId: startId, endId: endId, startUnix: start, endUnix: end, start: brushStart, end: brushEnd}
    d3.selectAll('.snapshot').style('stroke',  '#E2E6EA')
    for (let tid = startId; tid <= endId; tid++) {
      d3.select(`.snapshot_${tid}`).style('stroke', 'orange')
    }
    let textStart = brushStart.toLocaleDateString('en-US', TIPS_CONFIG)
    let textEnd = brushEnd.toLocaleDateString('en-US', TIPS_CONFIG)
    d3.select('#timeStartText')
      .classed('annotation', true)
      .text(textStart)
      .attr('transform', 'translate('+ selection[0] + ', 0)')

    d3.select('#timeEndText')
      .classed('annotation', true)
      .text(textEnd)
      .attr('transform', 'translate('+ selection[1] + ', 0)')

    d3.select('#brushPeriod')
      .attr('x', mainScale(brushStart))
      .attr('width', mainScale(brushEnd) - mainScale(brushStart))

    // networkcube.timeRange(brushStart.getTime(), brushEnd.getTime(), true)
    networkcube.sendMessage('timerange', {startUnix: brushStart.getTime(), endUnix: brushEnd.getTime(), textStart, textEnd })

  }

let moveHandle = function (m) {
  let msg = m.body
  let start = new Date(msg.timeStart)
  let end = new Date(msg.timeEnd)
  let dg = networkcube.getDynamicGraph()
  let startId = binarySearch(dg.timeArrays.unixTime, d => d >= msg.timeStart)
  let endId = binarySearch(dg.timeArrays.unixTime, d => d >= msg.timeEnd) - 1
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
    .datum(density)
    .style('fill', 'none')
    .classed('kdeLine', true)
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
     .attr('class', (d, i) => `snapshot snapshot_${i}`)
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
    .attr('id', 'hintLine')
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

let addGlobalInteractionForTypes = function (canvas, height) {
  let zoom = d3.zoom()
  .scaleExtent([1, 50])
  .translateExtent([[10,0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .extent([[0, 0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .on('zoom', globalZoom)
  let hint = canvas.append('rect')
     .attr('transform', `translate(${WIDTH_LEFT + MARGIN.left}, 0)`)
     .classed('hint', true)
     .attr('x', -10)
     .attr('y', 0)
     .attr('height', height)
     .attr('width', WIDTH_MIDDLE + 20)
     .style('opacity', 0)
     .style('pointer-events', 'all')
     .call(zoom)
  let g = canvas.append('g')
    .classed('strokeTimeline', true)
    .attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, 0)`)
    .append('g')
    .style('visibility', 'hidden')
  let line = g.append('line')
    .classed('vertical-hintline', true)
    .attr('x0', 0)
    .attr('x1', 0)
    .attr('y0', -5)
    .attr('y1', height - MARGIN.top)
    .style('stroke-linecap', 'round')
    .style('stroke-dasharray', '5,5')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .style('opacity', 0.5)
  hint.on('mousemove', function () {
      let x = d3.mouse(this)[0]
      if (x < 0 || x > WIDTH_MIDDLE) {
        g.style('visibility', 'hidden')
        return
      }
      g.style('visibility', 'visible')
      let date = xScale.invert(x)
      let content = date.toLocaleDateString('en-US', TIPS_CONFIG)
      d3.select('#mainFrame')
        .selectAll('.vertical-hintline')
          .attr('x2', x)
          .attr('x1', x)
      let boss = d3.select('#strokeTimeline')
      boss.select('rect')
        .attr('x', x - 45)
      boss.select('text')
       .attr('x', x+5)
        .text(content)
    })
}

let drawMeasure = function (canvas, title, dataList, id, idx, description = '', offset=0) {
  let svg =canvas.append('g')
    .classed('measureView', true)
    .attr('transform', `translate(0, ${idx * SVGHEIGHT})`)
    .classed(`timeline-${idx+offset}`, true)
    .attr('timeline-id', idx+offset)
  drawTitle(svg, title, description)
  let visItems = comparisonMeasureOvertime(svg, dataList, idx, id)
  visItems.forEach(vis => vis.title = title)
  drawIcons(svg, idx, visItems)
}

let comparisonMeasureOvertime = function (svg, dataList, idx, id) {
  if(dg.selection.length === 0) {
    let visItem = drawMeasureOvertime(svg, dataList, idx, id)
    return [visItem]
  }
  let len = dg.selection.length
  svgHeight = SVGheight / len
  let visItems = []
  for (let i = 0; i < len; i++) {
    let g = svg.append('g').attr('transform', `translate(${0}, ${svgHeight * i})`)
    let dotList = dg.selection[i].dotList[id]
    let maxY =  d3.max(dotList.map(dots => d3.max(dots.dots.map(v => v.y))))
    let color = dg.selection[i].color
    let index = dg.selection[i].id
    if(len===1) color='gray'
    let visItem = drawMeasureOvertime(g, dotList, idx, id, index, color, maxY)
    visItems.push(visItem)
  }
  return visItems
}

let drawMeasureOvertime = function (svg, dotList, idx, id, item = 0, color = 'gray', maxY = 0) {
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
    .selectAll('.tick text')
    .remove()
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(2))
  let tooltip = g.append('text')
     .attr('class', 'tooltip')
     .style('opacity', 0)
     .style('text-anchor', 'middle')
     .style('font-size', '0.9em')
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
  })
  dotList.reverse()
  let instantG = zoomLayer.append('g')
    .classed('brush-result', true)
  instantG.append('defs')
    .html(`	<pattern id='pattern_${item}_${idx}' patternUnits='userSpaceOnUse' width='5' height='5' patternTransform='rotate(45)'> 	<line x1='0' y='0' x2='0' y2='5' stroke='${color}' stroke-width='6' />	</pattern>`)
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
  // let visItem = new MeasureVis(zoomLayer, lineGenerator, yScale, id, item, dotList[0].dots)
  // CANVAS_INFO.push(visItem)
  // return visItem
}

class MeasureVis {
  constructor (g, lineGenerator, yScale, index, item, dots) {
    this.g = g  // zoom-layer
    this.lineGenerator = lineGenerator  // kdeline
    this.yScale = yScale  // bar chart scale
    this.index = index  // index
    this.item = item  // selection id
    this.dots = dots // finest granularity
    this.customDots = null
    this.customYscale = null
  }
}

let drawKdeLine = function (g, color, summary) {
  let density = Kde.kde(Kde.epanechinikov(BANDWIDTH), kdeScale.ticks(400), summary, timeStamp)
  g.select(`.kdeLine`).remove()
  let kdeYScale = d3.scaleLinear()
    .domain([0, d3.max(density.map(v => v.y))])
    .range([svgHeight / 6, -svgHeight / 6 + 2])
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
let initExternalSvg = function(canvas) {
  let selection = dgraph.selection
  let length = selection.length === 0?1:selection.length
  let svg = canvas.select('#detailTimeline').attr('width', '140vh').attr('height', '50vh')
  let paddingRate = 0.06
  let svgheight = parseFloat(svg.attr('height'))*(1-2*paddingRate)/length - 8
  let svgwidth = parseFloat(svg.attr('width'))*(1-2*paddingRate)
  let xScale = d3.scaleTime()
      .range([0, svgwidth])
      .domain([dgraph.roundedStart, dgraph.roundedEnd])
  svg.selectAll('g').remove()
  svg = svg.append('g').attr('transform', `translate(${ parseFloat(svg.attr('width'))*paddingRate*1.4}, ${ parseFloat(svg.attr('height'))*paddingRate})`)
  if (selection.length > 0) {
    let g =  svg.selectAll('.detailedTimelineG').data(selection.map(v => v.color)).enter()
      .append('g').attr('transform',(d,i)=> `translate(0,${i*svgheight})`).classed('detailedTimelineG', true)
    g.append('g')
      .classed('x-axis', true)
      .attr('transform', `translate(0, ${svgheight})`)
      .call(d3.axisBottom(xScale))
  }
  else {
    let g = svg.selectAll('.detailedTimelineG').data(['gray']).enter().append('g').classed('detailedTimelineG', true)
    g.append('g')
      .classed('x-axis', true)
      .attr('transform', `translate(0, ${svgheight})`)
      .call(d3.axisBottom(xScale))
    g.append('g')
      .classed('y-axis', true)
  }
  return xScale
}
let drawExternalSvg = function (dataList, canvas, xScale) {
  let selection = dgraph.selection
  let length = selection.length === 0?1:selection.length
  let svg = canvas.select('#detailTimeline')
  let paddingRate = 0.06
  let svgheight = parseFloat(svg.attr('height'))*(1-2*paddingRate)/length - 8
  let svgwidth = parseFloat(svg.attr('width'))*(1-2*paddingRate)
  let maxY = Math.max(d3.max(dataList.map(v => d3.max(v.dots, d => d.y))), MINI_YMAX)
  let yScale = d3.scaleLinear().domain([0, maxY]).range([svgheight, 0])
  svg.selectAll('.layer rect').attr('y', d => yScale(d.y)).attr('height', d => yScale(0) - yScale(d.y))
  svg.selectAll('.detailedTimelineG')
    .each(function(color, ig) {
       let g = d3.select(this)
       let data = dataList[ig].dots
       g.append('g')
         .classed('layer', true)
         .selectAll('rect')
         .data(data)
         .enter()
         .append('rect')
         .attr('x', d => xScale(d.timeStart))
         .attr('y', d => yScale(d.y))
         .attr('height', d => yScale(0) - yScale(d.y))
         .attr('width', d => {
           let value = (xScale(d.timeEnd) - xScale(d.timeStart))
           return Math.max(value, 1)
         })
         .style('fill', color)
         .style('opacity', 0.5)

       g.select('.y-axis').html('')
       g.select('.y-axis')
         .call(d3.axisLeft(yScale))
     })
    return yScale.domain()[1]
}
let drawExternalDiv = function (visItems, canvas, xScale) {
  let svg = canvas.select('#detailedSVG')
  svg.selectAll('g').remove()
  let contentId = visItems[0].index
  let canvasHeight = svg.attr('height')
  let canvasWidth = svg.attr('width')
  let paddingRate = 0.06
  let height = canvasHeight * (1 - 4 * paddingRate)
  let w = canvasWidth * (1 - 2 * paddingRate)
  let canvasg = svg.append('g').attr('transform', `translate(${canvasWidth * paddingRate * 1.4}, ${canvasHeight * paddingRate})`)
  let min_gran = window.dgraph.gran_min
  let max_gran = window.dgraph.gran_max
  visItems.forEach((vis, visi) => {
    let h = height / visItems.length - 2
    let layer = canvasg.append('g').attr('transform', `translate(0, ${visi * h})`)
    let dots = vis.dots
    let res = DataHandler.FourierTransform(dots, dgraph.timeArrays.intervals[0].period)
    res.forEach(d => {
      let milisecond = d.frequency * timeList[min_gran]
      for (let it = min_gran; it <= max_gran; it ++) {
        if (milisecond > timeList[max_gran]) {
          d.value = milisecond / timeList[max_gran]
          d.granularity = max_gran
          break;
        }
        if (it != timeList.length - 1 && timeList[it] <= milisecond && timeList[it+1] > milisecond) {
          d.value = milisecond / timeList[it]
          d.granularity = it
        }
      }
    })
    let labelData = DataHandler.generateDateLabel(min_gran, max_gran)
    let yDomain = d3.extent(res, d => d.magnitude)
    let xDomain = d3.extent(res, d => d.frequency)
    let yScale = d3.scaleLinear().domain([0, yDomain[1]]).range([h, 0])
    let xScale = d3.scaleLog().domain(xDomain).range([0, w])
    layer.append('text').classed('approxTooltip', true).text('').style('fill', 'black').style('text-anchor', 'middle')
    layer.append('g').classed('labelTick', true).selectAll('line')
      .data(labelData)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d.frequency))
      .attr('x2', d => xScale(d.frequency))
      .attr('y1', 0)
      .attr('y2', h)
      .style('stroke', 'lightsteelblue')
      .style('stroke-dasharray', '10,10')
      .style('cursor', 'pointer')
      .on('click', function (d) {
        $('#granValue').val(d.value)
        $('#granSelect').val(d.granularity)
        $('#granButton').trigger('click')
      })
    layer.append('g').classed('labelText',true).selectAll('text')
      .data(labelData)
      .enter()
      .append('text')
      .attr('x', d => xScale(d.frequency))
      .attr('y', h + 15)
      .text(d => d.label)
      .style('stroke-width', 3)
      .style('fill', 'black')
      .style('text-anchor', 'middle')
      .on('click', function (d) {
        $('#granValue').val(d.value)
        $('#granSelect').val(d.granularity)
        $('#granButton').trigger('click')
      })

    layer.append('g').selectAll('line')
      .data(res)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d.frequency))
      .attr('x2', d => xScale(d.frequency))
      .attr('y1', d => yScale(d.magnitude))
      .attr('y2', h)
      .style('stroke', 'black')
      .style('stroke-width', '0.1rem')
      .on('mouseover', function(d) {
        d3.select(this)
          .style('stroke', 'yellow')
          .style('stroke-width', '0.3rem')
        layer.select('.approxTooltip')
          .text(`${Number(d.value).toFixed(2)} ${GRANULARITY_names[d.granularity]}`)
          .attr('x', xScale(d.frequency))
          .attr('y', yScale(d.magnitude) - 3)
      })
      .on('mouseout', function (d) {
        d3.select(this)
          .style('stroke', 'black')
          .style('stroke-width', '0.1rem')
        layer.select('.approxTooltip').text('')
      })
      .on('click', function (d) {
        $('#granValue').val(d.value)
        $('#granSelect').val(d.granularity)
        $('#granButton').trigger('click')
      })
    layer.append('g').attr('transform', `translate(0,${h})`).classed('axis', true).call(d3.axisBottom(xScale)).selectAll('.tick').remove()
    let yAxis = layer.append('g').classed('axis', true).call(d3.axisLeft(yScale).ticks(5))
  })
  canvasg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y',  -canvasWidth * paddingRate / 2 - 5)
    .attr('x',  - canvasHeight / 2 )
    .style('text-anchor', 'middle')
    .style('fill', 'black')
    .style('font-size', 'small')
    .text('Magnitude')
  canvas.select('#configurationBar')
    .select('#granSelect')
    .selectAll('option')
    .data(GRANULARITY_names.slice(min_gran, max_gran + 1))
    .enter()
    .append('option')
    .attr('value', (d, i) => min_gran + i)
    .text( d => d)

  $('#granButton').click(function(){
    let value =  parseFloat($('#granValue').val())
    let granularity =  parseInt($('#granSelect').val())
    let intervals = DataHandler.getSingleBins(granularity, value)
    let data = dg.selection.length > 0 ? dg.selection.map(v => Calculator.getSingleData(v.dgraph, intervals, contentId)) : [Calculator.getSingleData(dg, intervals, contentId)]
    let yMax = drawExternalSvg(data, canvas, xScale)
    MINI_YMAX= yMax
  })
}

let tackleFFTresult = function (visItems, canvas) {
  let intervalList = []
  canvas = d3.select('#detailedTimeline')
  let xScale = initExternalSvg(canvas)
  drawExternalDiv(visItems, canvas, xScale)
}

let drawIcons = function (svg, idx, visItems=null) {
  let g = svg.append('g')
    .attr('transform', `translate(${WIDTH_LEFT + WIDTH_MIDDLE}, ${MARGIN.top})`)
  let data = [{
    text: '\uf062',
    callback: function () {
      let id = Number(svg.attr('timeline-id'))
      if(id === 0) return
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      d3.select(`.timeline-${id - 1}`).attr('timeline-id', id).attr('transform', `translate(0, ${id * SVGHEIGHT})`).classed(`timeline-${id}`, true).classed(`timeline-${id-1}`, false)
      svg.attr('timeline-id', id - 1).attr('timeline-id', id - 1).attr('transform', `translate(0, ${(id-1) * SVGHEIGHT})`).classed(`timeline-${id-1}`, true).classed(`timeline-${id}`, false)
    }
  } ,  {
    text: '\uf06e',
    toggle: 1,
    callback: function (element) {
      let ele = d3.select(element)
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
    text: '\uf0eb',
    callback: function() {
      let canvas = d3.select('#detailedTimeline')
        .style('display', 'block')
      canvas.select('h3')
        .text(visItems[0].title)
      tackleFFTresult(visItems, canvas)
    }
  },  {
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
   .attr('x', (d, i) => {
     if (i!=3) return MARGIN.left
     else return MARGIN.left + 8
   })
   .attr('y', (d, i) => {
     if (i!=3) return 15 * i + 15
     return 15
   })
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
   .on('mouseover', function() {
     d3.select(this).style('fill', `orange`)
   })
   .on('mouseout', function() {
     d3.select(this).style('fill', timeLineColor[idx])
   })
}

let drawTitle = function (svg, title, description) {
  let g = svg.append('g')
  let x = MARGIN.left
  let y = MARGIN.top
  let width = WIDTH_LEFT * 0.5
  let dy = 0.5
  let fontsize = 0.9 * parseFloat(getComputedStyle(document.documentElement).fontSize)
  let text = g.append('text')
   .classed('measureTitle', true)
   .attr('x', x)
   .attr('y', y)
   .style('font-size', fontsize)
   .attr('dy', `${dy}em,`)
   .text('hello')

 let words = title.split(' ').reverse(),
   word,
   line = [],
   lineNumber = 0,
   lineHeight = 1.1,
   tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', `${dy}em`)
  while (word = words.pop()) {
   line.push(word)
   let currentLine = line.join(' ')
   tspan.text(currentLine)
   if (currentLine.length * fontsize > width) {
     line.pop()
     tspan.text(line.join(' '))
     line = [word]
     tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', (++lineNumber) * lineHeight + dy + 'em').text(word)
   }
  }
  text.append('tspan')
   .attr('x', function () {
     return tspan.node().getComputedTextLength() + 2
   } )
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

export let drawTypeList = function (attribute, subgraph = window.dgraph) {
  let dgraph = subgraph
  let types = dgraph[`${attribute}TypeArrays`].name
  if (types.length === 0) return
  d3.select(`#${attribute}TypeFrame`).select('svg').remove()
  let canvas = d3.select(`#${attribute}TypeFrame`)
    .classed('measure-line-div', true)
    .append('svg')
    .attr('height', types.length * SVGHEIGHT + 12 )
    .attr('width', CANVAS_WIDTH)
    .append('g')
    .attr('transform', `translate(0,5)`)
  addGlobalInteractionForTypes (canvas, types.length * SVGHEIGHT + 12)
  let data = Timeline[`get${attribute.capitalize()}Stat`](dgraph, dgraph.timeArrays.intervals, types)
  types.forEach(function(name, i) {
    drawMeasure(canvas, name, data[name], `${attribute}Type_${name}`,  i, `The count of ${attribute} with type: ${name}.`, measureName.length + dgraph.linkTypeArrays.length)
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
  return GRANULARITY_name[granularity].capitalize() + ': ' + timeStart.toLocaleDateString('en-US', options) + ' ~ ' + timeEnd.toLocaleDateString('en-US', options)
}

class CanvasOption {
  constructor (divId) {
  }
  setSortable () {
     $("#measureFrame").sortable({placeholder: "ui-state-highlight",helper:'clone'})
     $( "div" ).disableSelection()
   }
   setConfig (dgraph) {
     setCanvasParameters('measureFrame', dgrpah)
   }
}

class TimeSlider {
  constructor (divId = "timeSliderFrame" ) {
    this.div = d3.select(`#${divId}`)
    this.div.select('svg').remove()
    this.svg = this.div.append('svg').attr('width', SVGWIDTH).attr('height', STATIC_SLIDER_HEIGHT + ZOOM_SLIDER_HEIGHT)
    .append('g').attr('transform', `translate(${WIDTH_LEFT + MARGIN.left}, 0)`)
    this.staticHeight = STATIC_SLIDER_HEIGHT
    this.sliderHeight = ZOOM_SLIDER_HEIGHT
    this.staticTimeline = this.svg.append('g').attr('transform', `translate(0, ${2/3*STATIC_SLIDER_HEIGHT})`)
    this.playerTimeline = this.svg.append('g').attr('transform', `translate(0, ${STATIC_SLIDER_HEIGHT + 1/5*ZOOM_SLIDER_HEIGHT})`)
    this.sliderTimeline = this.svg.append('g').attr('transform', `translate(0, ${STATIC_SLIDER_HEIGHT + 1/5*ZOOM_SLIDER_HEIGHT})`)
    this.hintCanvas = this.svg.append('g').attr('transform', `translate(0, ${STATIC_SLIDER_HEIGHT})`)
    this.kde = this.svg.append('g').attr('id', 'KDEsummary')
    this.intervalIndex = 0
    this.interval = []
  }
}
TimeSlider.prototype.init = function () {
  let self = this
   drawKDEsummary()
   this.playerTimeline.append('defs')
     .append('SVG:clipPath')
     .attr('id', `clip_intervals`)
     .append('SVG:rect')
     .attr('width', WIDTH_MIDDLE)
     .attr('height', 9)
     .attr('x', 0)
     .attr('y', -3)
    this.playerTimeline.append('defs')
       .html(`	<pattern id='pattern_interval' patternUnits='userSpaceOnUse' width='5' height='5' patternTransform='rotate(45)'> 	<line x1='0' y='0' x2='0' y2='5' stroke='lightskyblue' stroke-width='6' />	</pattern>`)
   let iconG = this.svg.append('g').attr('transform', `translate(${MARGIN.left}, ${STATIC_SLIDER_HEIGHT + 5})`)
   iconG.append('text')
     .text('\uf144')
     .attr('class', 'fas icon')
     .attr('x', '-2.4rem')
     .attr('y', 0)
     .style('font-family', 'Font Awesome 5 Free')
     .style('font-weight', 900)
     .style('font-size', '1.5rem')
     .style('fill', 'gray')
     .style('opacity', 0.5)
     .style('cursor', 'pointer')
     .on('click', function(){
       if (!window.playerMode) return
       self.play()
     })
   iconG
     .append('text')
     .text('\uf144')
      .attr('transform', 'rotate(180)')
     .attr('class', 'fas icon')
     .attr('x', '4rem')
     .attr('y', '1.13rem')
     .style('text-anchor', 'end')
     .style('font-family', 'Font Awesome 5 Free')
     .style('font-weight', 900)
     .style('font-size', '1.5rem')
     .style('fill', 'gray')
     .style('opacity', 0.5)
     .style('cursor', 'pointer')
     .on('click', function(){
       if (!window.playerMode) return
       self.replay()
     })

   this.staticTimeline.append('g')
     .selectAll('.snapshot')
     .data(window.dgraph.timeArrays.momentTime)
     .enter()
     .append('line')
     .style('stroke', '#E2E6EA')
     .attr('class', (d, i)=>`snapshot snapshot_${i}`)
     .attr('x1', d => mainScale(d._d))
     .attr('x2', d => mainScale(d._d))
     .attr('y1', 0)
     .attr('y2', - self.staticHeight  / 3)
  this.staticTimeline.append('g')
    .classed('static-timeline', true)
    .classed('timeslider', true).call(d3.axisTop(mainScale).ticks(6))
  let staticRangeG = this.staticTimeline.append('g')
  staticRangeG.append('rect')
    .style('fill', 'lightgray')
    .style('opacity', 0.3)
    .attr('id', 'currentPeriod')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', self.staticHeight / 6)
    .attr('width', WIDTH_MIDDLE)
  staticRangeG.append('rect')
    .style('fill', '#D6D6D6')
    .style('opacity', 1)
    .attr('id', 'brushPeriod')
    .attr('x', 0)
    .attr('y', 1)
    .attr('height', self.staticHeight / 6)
    .attr('width', WIDTH_MIDDLE)
  staticRangeG.append('path')
    .datum([[0, 0], [0,self.staticHeight / 6], [0, self.staticHeight / 6 + self.sliderHeight / 3]])
    .attr('id', 'startTimeCurve')
    .style('fill', 'none')
    .style('stroke', 'lightgray')
    .style('stroke-width', 4)
    .style('storke-linecap', 'round')
    .style('stroke-opacity', 0.3)
    .attr('d', periodLineGenerator)

  staticRangeG.append('path')
    .attr('id', 'endTimeCurve')
    .datum([[WIDTH_MIDDLE, 0], [WIDTH_MIDDLE, self.staticHeight / 6], [WIDTH_MIDDLE, self.staticHeight / 6 + self.staticHeight / 3]])
    .style('fill', 'none')
    .style('stroke', 'lightgray')
    .style('stroke-width', 4)
    .style('stroke-opacity', 0.3)
    .style('stroke-linecap', 'round')
    .attr('d', periodLineGenerator)

  this.sliderTimeline.append('g')
    .append('line')
    .attr('id', 'hintLine')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 0)
    .style('stroke-linecap', 'round')

  this.sliderTimeline.append('g')
     .classed('zoom-timeline', true)
     .classed('timeslider', true)
     .call(d3.axisBottom(xScale).ticks(6)).selectAll('.tick line').remove()

 let brushG = this.sliderTimeline
   .append('g')
   .attr('transform', `translate(0,${- this.sliderHeight / 5 - 2})`)
   .classed('brush-g', true)
   .call(brush)
   .call(brush.move, xScale.range())

 let textLayer = this.sliderTimeline.append('g')
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

this.hintCanvas.append('line')
  .classed('hint', true)
  .attr('x2', 0)
  .attr('x1', 0)
  .attr('y2', this.sliderHeight)
  .attr('y1', 3/5 * this.sliderHeight)
  .style('stroke-linecap', 'round')
  .style('stroke-dasharray', '5,5')
  .style('stroke-width', 1)
  .style('stroke', 'gray')
  .style('opacity', 0.5)

this.hintCanvas.append('rect')
   .style('fill', 'white')
   .attr('x', '-3rem')
   .attr('y',1 / 5 * this.sliderHeight + 6)
   .attr('height', '1rem')
   .attr('width', '6rem')
   .attr('rx', '0.3rem')
   .attr('ry', '0.3rem')
this.hintCanvas.append('text')
   .text('')
   .style('font-size', '0.85rem')
   .style('fill', 'gray')
   .style('font-family', 'cursive')
   .style('text-anchor', 'middle')
   .attr('y',  2 / 5 * this.sliderHeight + 10)
}

TimeSlider.prototype.zoomed = function () {

}

TimeSlider.prototype.updateHint = function (x, date) {
  let content = date.toLocaleDateString('en-US', TIPS_CONFIG)
  let boss = this.hintCanvas
  boss.select('line')
    .attr('x1', x)
    .attr('x2', x)
  boss.select('rect')
    .attr('x', x - 45)
  boss.select('text')
    .attr('x', x+5)
    .text(content)
}

TimeSlider.prototype.updateInterval = function (interval) {
  this.intervalIndex = -1
  this.interval = interval.period
  console.log('interval', interval)
  let g = this.playerTimeline.append('g')
    .attr('clip-path', `url(#clip_intervals)`)
  g.selectAll('rect')
    .data(interval.period)
    .enter()
    .append('rect')
    .classed('interval-bars', true)
    .attr('x', d => xScale(d.x1))
    .attr('width', d => 2)
    .attr('y', -3)
    .attr('height', 12)
    .style('fill', 'lightslategray')
    .style('stroke', 'white')
    .style('stroke-width', '0.5px')
    .style('opacity', 1)
 g.append('rect')
   .datum({
     x1: dg.roundedStart,
     x2: dg.roundedStart
   })
   .attr('x', 0).attr('y', 0).attr('width', 0).attr('height', 6)
   .classed('interval-bars', true)
   .style('fill', `url(#pattern_interval)`)
   .style('opacity', 0.75)
   .classed('highlight-interval', true)
}

TimeSlider.prototype.play = function () {
  if(!window.playerMode) return
  this.intervalIndex ++
  if (this.intervalIndex === this.interval.length) {
    this.intervalIndex = -1
  }
  this.highlight()
}
TimeSlider.prototype.replay = function () {
  if(!window.playerMode) return
  this.intervalIndex  --
  if(this.intervalIndex < 0) {
    this.intervalIndex = -1
    return
  }
  this.highlight()

}
TimeSlider.prototype.highlight = function () {

  if(this.intervalIndex === -1) {
    this.playerTimeline.select('.highlight-interval')
      .attr('width', 0)
    return
  }
  let d = this.interval[this.intervalIndex]
  d3.select('.brush-g').call(brush.move, [xScale(d.x0), xScale(d.x1)])
}
class Frame {
  static FATHER = 'measureFrame'
  constructor (dataLabel, title, description, idx) {
    /*Initiate the container */
    this.div = d3.select('#'+Frame.FATHER).append('div').classed('frame', true).attr('height', SVGHEIGHT).classed('sortable', true).style('position', 'relative')
    this.svg = this.div.append('svg').classed('frame-svg', true)
    .attr('height', SVGHEIGHT).attr('width', SVGWIDTH)
    this.container = this.svg.append('g')
    this.hciZoom =  this.container.append('g').attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, ${0})`)
    this.canvas = this.container.append('g').attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, ${0})`).classed('measureView', true)
    this.fftCanvas = this.svg.append('g').classed('fft-result', true).attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, ${0})`)
    this.dataLabel = dataLabel
    this.title = title
    this.description = description
    this.data = []
    this.yMax = []
    this.yScale = []
    this.lineGenerator = []
    this.fftData = []
    this.fftYscale = []
    this.index = idx
    return this
  }
}
Frame.prototype.init = function () {
    let g = this.canvas.append('g')
      .classed('strokeTimeline', true)
      .attr('transform', `translate(${0}, ${0})`)
      .style('visibility', 'hidden')
    g.append('line')
      .attr('x0', -5)
      .attr('y0', 0)
      .attr('x1', -5)
      .attr('y1', SVGHEIGHT)
      .classed('dash-timeline', true)
      .style('stroke-linecap', 'round')
      .style('stroke-dasharray', '5,5')
      .style('stroke-width', 1)
      .style('stroke', 'gray')
      .style('opacity', 0.5)
   this.hciZoom.append('rect')
       .attr('x', -5)
       .attr('y', 0)
       .attr('height', SVGHEIGHT)
       .attr('width', WIDTH_MIDDLE + 10)
      .style('opacity', 0)
      .style('pointer-events', 'all')
      .on('mousemove', function() {
        let x = d3.mouse(this)[0]
        if (x < 0 || x > WIDTH_MIDDLE) {
         d3.selectAll('.strokeTimeline').style('visibility', 'hidden')
          return
        }
        d3.selectAll('.strokeTimeline').style('visibility', 'visible')
        let date = xScale.invert(x)
        d3.select('#'+Frame.FATHER)
        .selectAll('.dash-timeline')
        .attr('x2', x)
        .attr('x1', x)
        timeslider.updateHint(x, date)
      })
      .call(zoom)
}
Frame.prototype.addData = function (data) {
  if(dg.selection.length === 1) {
    this.data[0] = data
    this.yMax[0] = (d3.max(data.map(d => d3.max(d.dots.map(v => v.y)))))
    this.fftData[0] = DataHandler.FourierTransform(data[0].dots, dgraph.timeArrays.intervals[0].period)
    return this
  }
  this.data.push(data)
  let yMax = d3.max(data.map(d => d3.max(d.dots.map(v => v.y))))
  this.yMax.push(yMax)
  this.fftData.push(DataHandler.FourierTransform(data[0].dots, dgraph.timeArrays.intervals[0].period))
  return this
}
Frame.prototype.drawTitle = function () {
  let description = this.description
  let x = 0
  let y = 0
  let g =  this.container.append('g').attr('transform', `translate(${MARGIN.left}, ${0})`)
  let width = WIDTH_LEFT * 0.5
  let dy = 0.5
  let fontsize = 0.9 * parseFloat(getComputedStyle(document.documentElement).fontSize)
  let text = g.append('text')
   .classed('measureTitle', true)
   .attr('x', x)
   .attr('y', y)
   .style('font-size', fontsize)
   .attr('dy', `${dy}em,`)
   .text('hello')

 let words = this.title.split(' ').reverse(),
   word,
   line = [],
   lineNumber = 0,
   lineHeight = 1.1,
   tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', `${dy}em`)
  while (word = words.pop()) {
   line.push(word)
   let currentLine = line.join(' ')
   tspan.text(currentLine)
   if (currentLine.length * fontsize > width) {
     line.pop()
     tspan.text(line.join(' '))
     line = [word]
     tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', (++lineNumber) * lineHeight + dy + 'em').text(word)
   }
  }
  text.append('tspan')
   .attr('x', function () {
     return tspan.node().getComputedTextLength() + 2
   } )
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
Frame.prototype.drawIcon = function () {
  let self = this
  let idx = this.index
  let g = this.container.append('g')
    .attr('transform', `translate(${WIDTH_LEFT + WIDTH_MIDDLE}, 0)`)
  let fftRes = this.fftData
  let data = [{
    text: '\uf2ed',
    class: '',
    callback: function() {
      self.div.style('display', 'none')
    }

  }, {
    text: '\uf362',
    class: 'handle',
    callback: function () {
    }
  } ,  {
    text: '\uf06e',
    toggle: 1,
    class: '',
    callback: function (element) {
      let ele = d3.select(element)
      let toggle = Number(ele.attr('toggle'))
      if (toggle) {
        ele.text('\uf070')
        ele.attr('toggle', 0)
        self.svg.selectAll('.kdeLine').style('display', 'none')
        return
      }
      ele.text('\uf06e')
      ele.attr('toggle', 1)
      self.svg.selectAll('.kdeLine').style('display', '')
    }
  }, {
    text: '\uf0eb',
    class: '',
    toggle: 0,
    callback: function(element) {
      let ele = d3.select(element)
      let toggle = 1 - parseInt(ele.attr('toggle'))
      ele.attr('toggle', toggle)
      if (toggle) {
        ele.style('fill', 'orange')
        self.canvas.selectAll('.zoom-layer').style('display', 'none')
        self.canvas.selectAll('.fft-result').style('display', '')
        let msg = {
          canvas: self.canvas,
          label: self.dataLabel,
          index: self.index,
          fft: self.fftData,
          flag: true
        }
        networkcube.sendMessage('fft', msg)
        window.activeMeasure = self
        ACTIVE_MEASURE_INDEX = self.index
        return
      }
      ele.style('fill', 'gray')
      self.canvas.selectAll('.zoom-layer').style('display', '')
      self.canvas.selectAll('.fft-result').style('display', 'none').html('')
      self.canvas.selectAll('.y-axis').each(function(d, i){
        let e = d3.select(this)
        e.call(d3.axisLeft(self.yScale[i]).ticks(5))
      })
      networkcube.sendMessage('fft', {flag: false})
    }
  }]
  g.selectAll('text')
   .data(data)
   .enter()
   .append('text')
   .attr('class', d => `icon fas ${d.class}`)
   .attr('x', (d, i) => {
  //   if (i!=3)
     return MARGIN.left
  //   else return MARGIN.left + 8
   })
   .attr('y', (d, i) => {
    // if (i!=3)
     return 15 * i + 15
    // return 15
   })
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
   .on('mouseover', function() {
     d3.select(this).style('fill', `orange`)
   })
   .on('mouseout', function(d,i) {
     if(i==4&&Number(d3.select(this).attr('toggle'))==1) return
     d3.select(this).style('fill', timeLineColor[idx])
   })
}

Frame.prototype.drawIndividualMeasures = function (idx) {
  let g = this.canvas
    .append('g')
    .classed(`vis_${this.index}`,true)
    .classed('mini_vis', true)
    .attr('transform', `translate(0,${idx * svgHeight + MARGIN.top})`)
  g.append('defs')
    .append('SVG:clipPath')
    .attr('id', `clip_${idx}_${this.index}`)
    .append('SVG:rect')
    .attr('width', WIDTH_MIDDLE)
    .attr('height',svgHeight + svgHeight / 6 + 5)
    .attr('x', 0)
    .attr('y', -svgHeight / 6 - 5)
  let yMax = this.yMax[idx]
  let yScale = d3.scaleLinear()
      .range([svgHeight, svgHeight / 6])
      .domain([0, this.yMax[idx]])
      .nice()
  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${svgHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll('.tick text')
    .remove()
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(2))
 let tooltip = g.append('text')
   .attr('class', 'tooltip')
   .style('opacity', 0)
   .style('text-anchor', 'middle')
   .style('font-size', '0.9rem')
 let timeTooltip = g.append('text')
   .attr('class', 'timeTooltip')
   .style('opacity', 0)
   .style('text-anchor', 'middle')
 let zoomLayer = g.append('g').attr('clip-path', `url(#clip_${idx}_${this.index})`).classed('zoom-layer', true)
 let summary = this.data[idx][0].dots.map(v => v.y)
 let color = dg.selection.length < 2 ? 'gray' : dg.selection[idx].color
 let lineGenerator = drawKdeLine(zoomLayer, color , summary)
 this.data[idx].reverse().forEach((res, i) => {
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
     .style('opacity', i / this.data[idx].length + 1 / this.data[idx].length)
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
        if((yMax-d.y)/yMax < 0.1) timeTooltip.attr('y', newY + 13)
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
 })
 this.data[idx].reverse()
 let instantG = zoomLayer.append('g')
   .classed('brush-result', true)
 instantG.append('defs')
   .html(`	<pattern id='pattern_${idx}_${this.index}' patternUnits='userSpaceOnUse' width='5' height='5' patternTransform='rotate(45)'> 	<line x1='0' y='0' x2='0' y2='5' stroke='${tinycolor(color).darken(15)}' stroke-width='6' />	</pattern>`)
 instantG.append('defs')
   .html(`	<pattern id='pattern2_${idx}_${this.index}' patternUnits='userSpaceOnUse' width='5' height='5' patternTransform='rotate(45)'> 	<line x1='0' y='0' x2='0' y2='5' stroke='${tinycolor(color).lighten(15)}' stroke-width='6' />	</pattern>`)
 instantG.append('rect')
   .classed('instance_rect', true)
   .attr('x', 0)
   .attr('y', 0)
   .attr('height', 0)
   .attr('width', 0)
   .style('fill', `url(#pattern_${idx}_${this.index})`)
   .style('opacity', 0.8)
 instantG.append('rect')
   .classed('overflow_rect', true)
   .attr('x', 0)
   .attr('y', 0)
   .attr('height', 0)
   .attr('width', 0)
   .style('fill', `url(#pattern2_${idx}_${this.index})`)
   .style('opacity', 0.8)
 instantG.append('text')
   .style('fill', 'black')
   .style('text-anchor', 'middle')
   .style('font-size', '1.5rem')
   .text('')
  this.yScale[idx] = yScale
  this.lineGenerator[idx] = lineGenerator
}
Frame.prototype.drawMeasureOvertime = function () {
  this.canvas.html('')
  let self = this
  this.data.forEach(function(d, idx) {
    self.drawIndividualMeasures(idx)
  })
}
Frame.prototype.drawExternalSvg = function (data) {
  let self = this
  let g = this.fftCanvas
  console.log('where', g)

  data.forEach(function(datum, idx){
    let bg = g.append('g')
     .attr('transform', `translate(0,${idx * svgHeight + MARGIN.top})`)
     .attr('clip-path', `url(#clip_${idx}_${self.index})`)
    let maxY = d3.max(datum.dots.map(v => v.y))
    if(self.fftYscale[idx]) {
      maxY = Math.max(self.fftYscale[idx].domain()[1], maxY)
    }
    let yScale = d3.scaleLinear().domain([0, maxY]).range([svgHeight, 0])
    self.fftYscale[idx] = yScale
    bg.selectAll('rect')
     .data(datum.dots)
     .enter()
     .append('rect')
     .attr('x', d => xScale(d.timeStart))
     .attr('y', d => yScale(d.y))
     .attr('height', d => yScale(0) - yScale(d.y))
     .attr('width', d => {
       let value = (xScale(d.timeEnd) - xScale(d.timeStart))
       return Math.max(value, 1)
     })
     .style('fill', 'gray')
     .style('opacity', 0.5)

   g.select('.y-axis').html('')
   g.select('.y-axis')
     .call(d3.axisLeft(yScale))

  })
}

Frame.prototype.build = function (data) {
  this.addData(data)
  this.drawTitle()
  this.drawIcon()
  this.drawMeasureOvertime()
  this.init()
  return this
}
let initInterval = function (msg) {
  let m = msg.body
   if (!m.flag) {
     timeslider.playerTimeline.selectAll('g').remove()
     timeslider.staticTimeline.selectAll('.snapshot').style('stroke', '#E2E6EA')
     timeslider.interval = []
     timeslider.intervalIndex = -1
     return
   }
   let granId = m.granId
   let value = m.val
   let shift = m.shift
   let timeSlot = DataHandler.getSingleBins(granId, value, dg.timeArrays.momentTime, shift)
   timeslider.updateInterval(timeSlot)
}
let addBars = function (msg) {
  console.log(msg, 'addBars')
  let m = msg.body
  let frame = FRAME_INFO[m.index]
  if(!m.flag) {
    frame.selectAll('.fft-result').selectAll('g').remove()
    return
  }
  let data = m.data
  frame.drawExternalSvg(data)
}
export let subgraphUpdateMeasure = function (dgraph, count) {
  SVGheight = SVGHEIGHT - MARGIN.bottom - MARGIN.bottom
  svgHeight = SVGheight / dgraph.selection.length
  for (let i = dgraph.selection.length - count; i <= dgraph.selection.length - 1; i ++) {
    let subgraph = dgraph.selection[i]
    FRAME_INFO.forEach(frame => {
      let id = frame.dataLabel
      frame.addData(subgraph.dotList[id])
    })
  }
  FRAME_INFO.forEach(frame => {
    frame.drawMeasureOvertime()
    frame.init()
  })
}

export let createNormalMeasures = function (dgraph) {
    FRAME_INFO = []
    if(dgraph.selection.length === 0) {
        let data = Timeline.getData(dgraph)
        let linkData = Timeline.getLinkStat(dgraph, dgraph.timeArrays.intervals, dgraph.linkTypeArrays.name)
        dgraph.linkTypeArrays.name.forEach(name => {
          data[`linkType_${name}`] = linkData[name]
        })
        let nodeData = Timeline.getNodeStat(dgraph, dgraph.timeArrays.intervals, dgraph.nodeTypeArrays.name)
        dgraph.nodeTypeArrays.name.forEach(name => {
          data[`NodeType_${name}`] = nodeData[name]
        })
        Object.keys(data).forEach((k, idx) => {
          if(k.substring(0, 9) === 'linkType_') {
            let frame = new Frame(k, 'Link: ' + k.substring(9), `The total number of links categorized as ${k.substring(9)}`, idx).build(data[k])
            FRAME_INFO.push(frame)
          }
          else if(k.substring(0, 9) === 'nodeType_') {
            let frame = new Frame(k, 'Node: ' + k.substring(9), `The total number of nodes categorized as ${k.substring(9)}`, idx).build(data[k])
            FRAME_INFO.push(frame)
          }
          else {
            let frame = new Frame(k, Constant.title[k], Constant.description[k], idx).build(data[k])
          FRAME_INFO.push(frame)
          }
        })
    } else {
      Object.keys(dgraph.selection[0].dotList).forEach(function(k, idx) {
        let frame
        if(k.substring(0, 9) === 'linkType_') {
          frame = new Frame(k, 'Link: ' + k.substring(9), `The total number of links categorized as ${k.substring(9)}`, idx)
          dgraph.selection.forEach(subgraph => {
            frame.addData(subgraph.dotList[k])
          })
        }
        else if(k.substring(0, 9) === 'nodeType_') {
          frame = new Frame(k, 'Node: ' + k.substring(9), `The total number of nodes categorized as ${k.substring(9)}`, idx)
          dgraph.selection.forEach(subgraph => {
            frame.addData(subgraph.dotList[k])
          })
        }
        else {
          frame = new Frame(k, Constant.title[k], Constant.description[k], idx)
          dgraph.selection.forEach(subgraph => {
            frame.addData(subgraph.dotList[k])
          })
        }
        frame.drawTitle()
        frame.drawIcon()
        frame.drawMeasureOvertime()
        frame.init()
        FRAME_INFO.push(frame)
      })
    }

}
export function measureFrameInit (dgraph, divId = 'measureFrame') {
  d3.select(`#${divId}`).html('')
  setCanvasParameters('measureFrame', window.dgraph)
  timeslider =  new TimeSlider()
  timeslider.init()
  createNormalMeasures(dgraph)
  networkcube.addEventListener('focusPeriod', moveHandle)
  networkcube.addEventListener('bandwidth', changeKDE)
  networkcube.addEventListener('initGran', initInterval)
  networkcube.addEventListener('slotData', addBars)
}
