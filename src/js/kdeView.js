let kdeDivId = 'kdeFrame'
const kdeSvgId = 'kde'
let kdeHeight
let kdeWidth
let kdeSvgHeight
let kdeSvgWidth
let timeScale
let xScale
let nodeStat
let linkStat
let linkPairStat
const scatterRadius = 2
const scatterLineWidth = 2
const granularityColor = ['#E74C3C', '#8E44AD','#2980B9', '#1ABC9C', '#16A085', '#F1C40F', '#F39C12', '#3498DB',' #800080', ]
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*30*12, 1000*60*60*24*30*12*10, 1000*60*60*24*30*12*100, 1000*60*60*24*30*12*1000]
const kdeColor = ['silver', 'yellow', 'orange','green', 'teal', 'blue', 'navy', 'brown', 'red', 'maroon', 'fuchisia', 'purple']
const margin = {
  'top': 5,
  'left': 35,
  'right': 25,
  'bottom': 20
}
let dgraph
let BANDWITH = 0.5

/*
Linear transformation of the timescale
*/
export let getTimeStamp = function (dgraph = window.dgraph) {
  let timeArray = dgraph.timeArrays.momentTime.map(v => v._i)
  let gran_min = timeList[dgraph.gran_min + 2]
  let timeStamp = timeArray.map((v, i) => {
    if (i === 0) return 0
    return (v - timeArray[i-1])
  })
  let timeDelta = d3.mean(timeStamp)
  let timeValue = timeArray.map((v, i) => {
    if (i === 0) return 0
    return (v - timeArray[0]) / timeDelta
  })
  return timeValue
}

export let drawKde = function (divId) {
  kdeDivId = divId
  kdeWidth = $('#' + kdeDivId).innerWidth()
  kdeHeight =$('#' + kdeDivId).innerHeight() * 0.25
  kdeSvgHeight = kdeHeight
  kdeSvgWidth = kdeWidth - margin.left - margin.right
  dgraph = window.dgraph
  let timeValue = getTimeStamp()
  xScale = d3.scaleLinear()
    .range([0, kdeSvgWidth])
    .domain([timeValue[0], timeValue[timeValue.length -  1]])
  timeScale = d3.scaleTime()
    .range([0, kdeSvgWidth])
    .domain([dgraph.timeArrays.momentTime[0]._d, dgraph.timeArrays.momentTime[dgraph.timeArrays.momentTime.length - 1]._d])

  let thresholds = xScale.ticks(100)
  nodeStat = getNodeStat()
  linkStat = getLinkStat()
  linkPairStat = getLinkPairStat()
  drawCollapseTimeLine(1, 'nodeCount', 'Node Number', nodeStat, thresholds, timeValue)
  drawCollapseTimeLine(2, 'linkCount', 'Link Number', linkStat, thresholds, timeValue)
  drawCollapseTimeLine(3, 'linkPairCount', 'Link Pair Number', linkPairStat, thresholds, timeValue)
  networkcube.addEventListener('bandwidth', m => {
    BANDWITH = m.body
    redrawCollapseTimeLine(1, 'nodeCount', 'Node Number', nodeStat, thresholds, timeValue)
    redrawCollapseTimeLine(2, 'linkCount', 'Link Number', linkStat, thresholds, timeValue)
    redrawCollapseTimeLine(3, 'linkPairCount', 'Link Pair Number', linkPairStat, thresholds, timeValue)
  })
}

export let kde = function (kernel, thresholds, summary, timeValue) {
  let datasize = summary.reduce((a, b) => a + b, 0)
  if(datasize == 0) console.log('so sad for 0', summary)
  let ans = thresholds.map(t => {
    let total = 0
    summary.forEach((v, i) => {
      total += v * kernel(t - timeValue[i])
    })
    let y = total / datasize || 0   // NOtice that datasize might be 0
    return {x: t, y: y}
  })
  return ans

}

export let epanechinikov = function (bandwidth = 1, amplitude = 0.75) {
  return function (x) {
    x /= bandwidth
    let value =  Math.abs(x) <= 1 ? amplitude * (1 - x * x) / bandwidth : 0
    return value
  }
}

let getLinkStat = function () {
  let timeStamp = dgraph.timeArrays.momentTime
  let summary = dgraph.timeArrays.links.map(v => v.length)
  return summary
}

let getLinkPairStat = function () {
  let timeStamp = dgraph.timeArrays.momentTime
  let summary = dgraph.timeArrays.links.map(v => v.length)
  return summary
}

let getNodeStat = function () {
  let timeStamp = dgraph.timeArrays.momentTime
  let summary = dgraph.timeArrays.links.map(links => {
    let nodes = new Set()
    links.forEach(lid => {
        nodes.add(dgraph.linkArrays.source[lid])
        nodes.add(dgraph.linkArrays.target[lid])
    })
    return nodes.size
  })
  return summary
}
let redrawCollapseTimeLine = function (idx, id, title, summary, thresholds, timeValue) {
    let density = kde(epanechinikov(BANDWITH), thresholds, summary, timeValue)
    let thumbYScale = d3.scaleLinear()
      .range([$(`#${id}OuterDiv`).innerHeight(), 5])
      .domain([0, d3.max(density.map(v => v.y))])
    d3.select(`#${id}Thumbnail`).select('path')
      .datum(density)
      .attr('d', d3.area()
          .x(d => xScale(d.x))
          .y0(thumbYScale(0))
          .y1(d => thumbYScale(d.y))
          )
    let line = d3.line()
        .curve(d3.curveCardinal)
        .x(d => xScale(d.x))
        .y(d => kdeScale(d.y))
    let kdeScale = d3.scaleLinear()
      .domain([0, d3.max(density.map(v => v.y))])
      .range([kdeSvgHeight / 3, 0])
    d3.select(`#${id}_kde`).datum(density).attr('d', line)
}
let drawCollapseTimeLine = function(idx, id, title, summary, thresholds, timeValue) {
  let density = kde(epanechinikov(BANDWITH), thresholds, summary, timeValue)
  let bins = summary.map((v, i) => {
    return {
      x: timeValue[i],
      y: v
    }
  })
  // container
  let div = d3.select(`#${kdeDivId}`)
    .selectAll(`.${id}outerDiv`)
    .data([{'toggle': false}])
    .enter()
    .append('div')
    .attr('id', `${id}OuterDiv`)
    .classed(`${id}outerDiv`, true)
    .classed('outerDiv', true)
    .style('height', d => d.toggle === false ? '5vh' : kdeHeight)
    .style('width', '100%')
    .style('position', 'relative')
    .on('click', function (d) {
      d.toggle = !d.toggle
      if (d.toggle) {
        svgDiv.style('display', 'none')
        thumbnail.style('display', 'block')
      }
      else {
        svgDiv.style('display', 'block')
        thumbnail.style('display', 'none')
      }
    })
  let line = d3.line()
      .curve(d3.curveCardinal)
      .x(d => xScale(d.x))
      .y(d => kdeScale(d.y))

  let thumbYScale = d3.scaleLinear()
    .range([$(`#${id}OuterDiv`).innerHeight(), 5])
    .domain([0, d3.max(density.map(v => v.y))])
  let yScale = d3.scaleLinear()
    .domain([0, d3.max(bins.map(v => v.y))])
    .range([kdeSvgHeight - margin.top - margin.bottom, 0])
    .nice()
  let kdeScale = d3.scaleLinear()
    .domain([0, d3.max(density.map(v => v.y))])
    .range([kdeSvgHeight / 3, 0])
  // overview of the line chart
  let thumbnail = div.append('svg')
    .attr('id', `${id}Thumbnail`)
    .attr('height', $(`#${id}OuterDiv`).innerHeight())
    .attr('width', $(`#${id}OuterDiv`).innerWidth())
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .append('path')
    .datum(density)
    .style('fill', kdeColor[idx])
    .style('opacity', 0.7)
    .style('stroke', kdeColor[idx])
    .style('stroke-width', 1.5)
    .attr('d', d3.area()
      .x(d => xScale(d.x))
      .y0(thumbYScale(0))
      .y1(d => thumbYScale(d.y))
      )
  // detailed view of the line chart
  let svgDiv = d3.select(`#${kdeDivId}`)
    .append('div')
    .style('height', kdeSvgHeight)
    .style('width', $(`#${id}OuterDiv`).innerWidth())
    .style('display', 'none')
  let svg = svgDiv.append('svg')
    .attr('id', `${id}`)
    .attr('height', kdeSvgHeight)
    .attr('width', $(`#${id}OuterDiv`).innerWidth())
  let g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${kdeSvgHeight - margin.top - margin.bottom})`)
    .call(d3.axisBottom(timeScale).ticks(8))
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(5))

 g.selectAll('.bars')
   .data(bins)
   .enter()
   .append('line')
   .classed('bars', true)
   .attr('x1', d => xScale(d.x))
   .attr('x2', d => xScale(d.x))
   .attr('y1', kdeSvgHeight - margin.top - margin.bottom)
   .attr('y2', d => yScale(d.y))
   .style('stroke-width', 5)
   .style('opacity', 0.5)
   .style('stroke', 'gray')
 g.append('path')
   .attr('id', `${id}_kde`)
   .datum(density)
   .style('fill', 'none')
   .style('stroke', '#000')
   .style('stroke-width', 1.5)
   .style('stroke-linejoin', 'round')
   .attr('d', line)

  // title of the measure
  div
    .append('p')
    .classed('title', true)
    .text(title)
    .style('position', 'absolute')
    .style('top', '0.5vh')
    .style('left', '1vh')
}
