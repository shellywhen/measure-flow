import * as DataHandler from './dataHandler.js'
import * as Timeline from './timelineView.js'
import * as Kde from './kdeView.js'
let CANVAS_HEIGHT, CANVAS_WIDTH, SVGHEIGHT, SVGWIDTH, SVGheight, SVGwidth
export let WIDTH_RIGHT, WIDTH_MIDDLE, WIDTH_LEFT
let CANVAS
let data
const measureName = ['nodeNumber', 'linkNumber', 'linkPairNumber', 'density', 'activation', 'redundancy', 'volatility', 'component']
export let BANDWIDTH = 0.5
const RATIO_LEFT = 0.13, RATIO_MIDDLE = 0.83, RATIO_RIGHT = 0.04
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*30*12*10, 1000*60*60*24*30*12*100, 1000*60*60*24*30*12*1000]
let timeLineColor = ['orange','darkgreen', 'teal', 'blue','purple', 'red', 'crimson', 'coral', 'fuchisia']
let xScale, kdeScale, timeStamp, mainScale
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

let setCanvasParameters = function (divId) {
  MEASURE_DIV_ID = divId
  CANVAS_HEIGHT = $(`#${divId}`).innerHeight()
  CANVAS_WIDTH = Math.floor($(`#${divId}`).innerWidth())
  CANVAS = d3.select(`#${divId}`).append('svg').attr('height', CANVAS_HEIGHT).attr('width', CANVAS_WIDTH)
  WIDTH_LEFT = CANVAS_WIDTH * RATIO_LEFT
  WIDTH_MIDDLE = CANVAS_WIDTH * RATIO_MIDDLE
  WIDTH_RIGHT = CANVAS_WIDTH* RATIO_RIGHT
  SVGHEIGHT = Math.max((CANVAS_HEIGHT - 10) / ELEMENTS, 50)
  SVGWIDTH = CANVAS_WIDTH
  SVGheight = SVGHEIGHT - MARGIN.top - MARGIN.bottom
  SVGwidth = SVGWIDTH - MARGIN.left - MARGIN.right
  xScale = d3.scaleTime()
      .range([0, WIDTH_MIDDLE])
      .domain([window.dgraph.roundedStart, window.dgraph.roundedEnd])
  mainScale = xScale.copy()
}

export let drawMeasureList = function (divId) {
  let dgraph = networkcube.getDynamicGraph()
  setCanvasParameters(divId)
  data = Timeline.getData(dgraph)
  timeStamp = DataHandler.getTimeStamp(dgraph)
  let startTime = dgraph.timeArrays.momentTime[0]._i
  let scaleStart =  (dgraph.roundedStart - startTime) / dgraph.timeDelta
  let scaleEnd = (dgraph.roundedEnd - startTime) / dgraph.timeDelta
  kdeScale = d3.scaleLinear().range([0, WIDTH_MIDDLE]).domain([scaleStart, scaleEnd])
  addGlobalInteraction()
  addMeasureWindow(dgraph)
  networkcube.addEventListener('bandwidth', function (m) {
    BANDWIDTH = m.body
    measureName.forEach((name, i) => {
        let summary = data[name][data[name].length - 1].dots.map(v => v.y)
        let g = d3.select(`.vis_${i}`)
        drawKdeLine(g, i, summary)
    })
  })

}

let addMeasureWindow = function (dgraph) {
  let data = Timeline.getData(dgraph)
  drawMeasure('Connected Nodes', data.nodeNumber, 'nodeCount', 0)
  drawMeasure('Active Links', data.linkNumber, 'linkCount', 1)
  drawMeasure('Active Link Pairs', data.linkPairNumber, 'linkPairCount', 2)
  drawMeasure('Density', data.density, 'density', 3)
  drawMeasure('Activation', data.activation, 'activation', 4)
  drawMeasure('Redundancy', data.redundancy, 'redundancy', 5)
  drawMeasure('Volatility', data.volatility, 'volatility', 6)
  drawMeasure('Connected Component', data.component, 'component', 7)

}

let addTimeline = function () {
  let g = CANVAS
    .append('g')
    .attr('transform', `translate(${WIDTH_LEFT+MARGIN.left}, 0)`)
    .style('display', 'none')
  let line = g.append('line').attr('id', 'hintline')
    .attr('x0', 0)
    .attr('x1', 0)
    .attr('y0', 0)
    .attr('y1', CANVAS_HEIGHT - MARGIN.top)
    .style('stroke-linecap', 'round')
    .style('stroke-dasharray', '5,5')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .style('opacity', 0.5)
  g.append('text')
   .text('hint')
   .style('font-size', '0.8rem')
   .style('fill', 'black')
   .attr('y', 10)

  d3.selectAll('.hint')
   .on('mousemove', function () {
     let x = d3.mouse(this)[0]
     if (x < 0 || x > WIDTH_MIDDLE) {
       g.style('display', 'none')
       return
     }
     g.style('display', '')
     let date = xScale.invert(x)
     let content = date.toLocaleDateString("en-US", {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
     line.attr('x2', x)
         .attr('x1', x)
     g.select('text')
       .attr('x', x+5)
       .text(content)
   })
}

let globalZoom = function () {
  xScale = d3.event.transform.rescaleX(mainScale)
  let newKDE = d3.event.transform.rescaleX(kdeScale)
  let div = d3.select(`#${MEASURE_DIV_ID}`)
  div.selectAll('.x-axis').call(d3.axisBottom(xScale).ticks(4)).selectAll(".tick text").remove()//.style('fill', 'gray')
  d3.selectAll('.bars').attr('x', d => xScale(d.timeStart)).attr('width', d => {
    let value = (xScale(d.timeEnd) - xScale(d.timeStart)) - rectPadding
    return Math.max(value, 1)
  })
  CANVAS_INFO.forEach(vis => {
    vis.g.selectAll('.kdeLine').attr('d', d => vis.lineGenerator.x(d => newKDE(d.x))(d))
  })
}

let addGlobalInteraction = function () {
  let zoom = d3.zoom()
  .scaleExtent([1, 50])
  .translateExtent([[10,0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .extent([[0, 0], [WIDTH_MIDDLE, CANVAS_HEIGHT]])
  .on('zoom', globalZoom)

  CANVAS.append('rect')
     .attr('transform', `translate(${WIDTH_LEFT + MARGIN.left}, 0)`)
     .classed('hint', true)
     .attr('x', -10)
     .attr('y', 0)
     .attr('height', CANVAS_HEIGHT)
     .attr('width', WIDTH_MIDDLE + 20)
     .style('opacity', 0)
     .style('pointer-events', 'all')
     .call(zoom)
  addTimeline()
}

let drawMeasure = function (title, dataList, id, idx) {
  let svg = CANVAS.append('g')
    .classed('measureView', true)
    .attr('transform', `translate(0, ${idx * SVGHEIGHT + 10})`)
    .classed(`timeline-${idx}`, true)
    .attr('timeline-id', idx)
  drawTitle(svg, title)
  drawMeasureOvertime(svg, dataList, idx)
  drawIcons(svg, idx)
}

let drawMeasureOvertime = function (svg, dotList, idx) {
  let maxY = dotList.map(dots => d3.max(dots.dots.map(v => v.y)))
  let yScale = d3.scaleLinear()
    .range([SVGheight, SVGheight / 6])
    .domain([0, d3.max(maxY)])
    .nice()
  let g = svg.append('g')
    .attr('transform', `translate(${MARGIN.left + WIDTH_LEFT}, ${MARGIN.top})`)
    .classed(`vis_${idx}`, true)
  let tooltip = g.append('text')
    .attr('class', 'tooltip')
    .style('opacity', 0)
  g.append('defs')
    .append('SVG:clipPath')
    .attr('id', `clip_${idx}`)
    .append('SVG:rect')
    .attr('width', WIDTH_MIDDLE)
    .attr('height', SVGheight+5)
    .attr('x', 0)
    .attr('y', -5)
  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${SVGheight})`)
    .call(d3.axisBottom(xScale))
    .selectAll(".tick text")
    .remove()
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(2))
  let zoomLayer = g.append('g').attr('clip-path', `url(#clip_${idx})`).classed('zoom-layer', true)
  let summary = dotList[0].dots.map(v => v.y)
  dotList.reverse().forEach((res, i) => {
    let data = res.dots
    zoomLayer.append('g')
      .selectAll('.bars')
      .data(data)
      .enter()
      .append('rect')
      .classed('bars', true)
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
      .style('fill', timeLineColor[idx])
      .style('opacity', i / dotList.length + 1 / dotList.length)
      .style('stroke-width', Math.log(i*10))
      .on('mouseover', function (d) {
        let self = d3.select(this)
        d3.select(this).style('stroke', 'yellow').style('stroke-width', 3)
        let newX =  parseFloat(self.attr('x')) + parseFloat(self.attr('width')) / 2
        let newY =  parseFloat(self.attr('y')) - 5
        tooltip
          .attr('x', newX)
          .attr('y', newY)
          .text(Number(self.attr('data')).toFixed(2))
          .style('text-anchor', 'middle')
          .transition().duration(200)
          .style('opacity', 1)
      })
      .on('mouseout', function (d) {
        tooltip.transition().duration(200)
          .style('opacity', 0)
        d3.select(this).style('stroke', '')
      })
      .on('click', function (d) {
        networkcube.sendMessage('focusPeriod', d)
      })

    zoomLayer.append('g')
     .classed(`dots_${i}`, true)
     .selectAll('circle')
     .data(data)
     .enter()
     .append('circle')
     .attr('cx', d => xScale(d.timeStart))
     .attr('cy', d => yScale(d.y))
     .attr('r', scatterRadius)
     .style('fill', timeLineColor[idx])
     .style('display', 'none')
     .style('opacity', i / dotList.length + 1 / dotList.length)
  })

  let lineGenerator = drawKdeLine(zoomLayer, idx, summary)
  CANVAS_INFO.push(new MeasureVis(g, lineGenerator))
}

class MeasureVis {
  constructor (g, lineGenerator) {
    this.g = g
    this.lineGenerator = lineGenerator
  }
}

let drawKdeLine = function (g, idx, summary) {
  let density = Kde.kde(Kde.epanechinikov(BANDWIDTH), kdeScale.ticks(200), summary, timeStamp)
  g.selectAll(`.kdeLine`).remove()
  let kdeYScale = d3.scaleLinear()
    .domain([0, d3.max(density.map(v => v.y))])
    .range([SVGheight / 3, 0])
  let line = d3.line()
      .curve(d3.curveCardinal)
      .x(d => kdeScale(d.x))
      .y(d => kdeYScale(d.y))
  g.append('path')
    .classed('kdeLine', true)
    .datum(density)
    .style('fill', 'none')
    .style('stroke', timeLineColor[idx])
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

let drawTitle = function (svg, title) {
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

}
