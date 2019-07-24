const timelineDivId = 'timelineFrame'
const timelineSvgId = 'timeline'
const timelineHeight = $('#' + timelineDivId).innerHeight()
const timelineWidth = $('#' + timelineDivId).innerWidth()
const timelineSvgHeight = timelineHeight * 0.5
const scatterRadius = 2
const scatterLineWidth = 2
const granularityColor = ['#E74C3C', '#8E44AD','#2980B9', '#1ABC9C', '#16A085', '#F1C40F', '#F39C12', '#3498DB', '#3498DB']
const timeList = [1, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*30*12, 1000*60*60*24*30*12*10, 1000*60*60*24*30*12*100, 1000*60*60*24*30*12*1000]
const margin = {
  'top': 5,
  'left': 35,
  'right': 25,
  'bottom': 20
}
let globalMeasureList = ['numberOfNodes', 'numberOfNodePairs', 'numberOfLinks', 'diameter', 'clusteringCoefficient']
let timeLineColor = ['silver', 'yellow', 'orange','green', 'teal', 'blue', 'navy', 'brown', 'red', 'purple']
let getTimeIntervals = function (timeArray = window.dgraph.timeArrays.momentTime, minGran, maxGran) {
  let results = []
  for (let granId = minGran; granId <= maxGran; granId ++) {
    let result = {'granularity': granId}
    let period = []
    let interval = timeList[granId] // aggregated graph indicator
    let startId = 0
    for (let endId = 0; endId < timeArray.length; endId ++) {
      if (timeArray[endId]._i - timeArray[startId]._i > interval) {
        period.push([startId, endId - 1])
        startId = endId
      }
    }
    period.push([startId, timeArray.length - 1])
    result['period'] = period
    results.push(result)
  }
  return results
}

let getNumberOfNodes = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    let nodes = new Set()
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      let links = dgraph.timeArrays.links[t]
      for (let l of links) {
        nodes.add(dgraph.linkArrays.source[l])
        nodes.add(dgraph.linkArrays.target[l])
      }
    }
    dots.push({
      'timeStart': dgraph.timeArrays.momentTime[itv[0]]._d,
      'timeEnd': dgraph.timeArrays.momentTime[itv[1]]._d,
      'y': nodes.size})
  }
  return dots
}

let getNumberOfLinkPairs = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    let linkPairs = new Set()
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      let links = dgraph.timeArrays.links[t]
      for (let l of links) {
        linkPairs.add(dgraph.linkArrays.source[l].toString() + ' ' + dgraph.linkArrays.target[l].toString())
        linkPairs.add(dgraph.linkArrays.target[l].toString() + ' ' + dgraph.linkArrays.source[l].toString())
      }
    }
    dots.push({
      'timeStart': dgraph.timeArrays.momentTime[itv[0]]._d,
      'timeEnd': dgraph.timeArrays.momentTime[itv[1]]._d,
      'y': linkPairs.size / 2})
  }
  return dots
}

let getNumberOfLinks = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    let sum = 0
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      sum += dgraph.timeArrays.links[t].length
    }
    dots.push({
      'timeStart': dgraph.timeArrays.momentTime[itv[0]]._d,
      'timeEnd': dgraph.timeArrays.momentTime[itv[1]]._d,
      'y': sum})
  }
  return dots
}

let getActivation = function (dgraph, interval) {
  let dots = []
  let linkList = dgraph.timeArrays.links
  let current = new Set()
  interval.forEach(itv => {
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.source[l])
        current.add(dgraph.linkArrays.target[l])
      })
    }
    dots.push({
      'timeStart': dgraph.timeArrays.momentTime[itv[0]]._d,
      'timeEnd': dgraph.timeArrays.momentTime[itv[1]]._d,
      'y': current.size})
  })
  return dots
}

let getRedundancy = function (dgraph, interval) {
  let dots = [{'timeStart': dgraph.timeArrays.momentTime[interval[0][0]]._d,
  'timeEnd': dgraph.timeArrays.momentTime[interval[0][1]]._d,
  'y': 0}]
  let linkList = dgraph.timeArrays.links
  let previous = new Set()
  for (let t = interval[0][0]; t <= interval[0][1]; t++) {
    linkList[t].forEach( l => {
      previous.add(dgraph.linkArrays.source[l])
      previous.add(dgraph.linkArrays.target[l])
    })
  }
  for (let i = 1; i < interval.length; i ++) {
    let current = new Set()
    let itv = interval[i]
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.source[l])
        current.add(dgraph.linkArrays.target[l])
      })
    }
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push({
      'timeStart': dgraph.timeArrays.momentTime[itv[0]]._d,
      'timeEnd': dgraph.timeArrays.momentTime[itv[1]]._d,
      'y': intersection.size})
    previous = current
  }
  return dots
}
let getDots = function (dots) {
  let results = []
  for (let dot of dots) {
    if (dot.timeStart == dot.timeEnd) {
      results.push({
        'time': dot.timeStart,
        'y': dot.y
      })
    }
    else {
      results.push({
        'time': dot.timeStart,
        'y': dot.y
      })
      results.push({
        'time': dot.timeEnd,
        'y': dot.y
      })
    }
  }
  return results
}
// draw timeline for each global measures
let drawCollapseTimeLine = function(idx, dotList, id, title, xScale) {
  // container
  let div = d3.select('#timelineFrame')
    .selectAll(`.${id}outerDiv`)
    .data([{'toggle': false}])
    .enter()
    .append('div')
    .attr('id', `${id}OuterDiv`)
    .classed(`${id}outerDiv`, true)
    .classed('outerDiv', true)
    .style('height', d => d.toggle === false ? '5vh' : timelineHeight)
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
  let maxY = dotList.map(dots => d3.max(dots.dots.map(v => v.y)))
  let thumbYScale = d3.scaleLinear()
    .range([$(`#${id}OuterDiv`).innerHeight(), 5])
    .domain([0, maxY[0]])
  // overview of the line chart
  let thumbnail = div.append('svg')
    .attr('id', `${id}Thumbnail`)
    .attr('height', $(`#${id}OuterDiv`).innerHeight())
    .attr('width', $(`#${id}OuterDiv`).innerWidth())
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .append('path')
    .datum(dotList[0].dots)
    .style('fill', timeLineColor[idx])
    .style('opacity', 0.7)
    .style('stroke', timeLineColor[idx])
    .style('stroke-width', 1.5)
    .attr('d', d3.area()
      .x(d => xScale(d.timeStart))
      .y0(thumbYScale(0))
      .y1(d => thumbYScale(d.y))
      )
  let yScale = d3.scaleLinear()
    .range([timelineSvgHeight - margin.top - margin.bottom, margin.top])
    .domain([0, d3.max(maxY)])

  // detailed view of the line chart
  let svgDiv = d3.select('#timelineFrame')
    .append('div')
    .style('height', timelineSvgHeight)
    .style('width', $(`#${id}OuterDiv`).innerWidth())
    .style('display', 'none')
  let svg = svgDiv.append('svg')
    .attr('id', `${id}`)
    .attr('height', timelineSvgHeight)
    .attr('width', $(`#${id}OuterDiv`).innerWidth())
  let g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${timelineSvgHeight - margin.top - margin.bottom})`)
    .call(d3.axisBottom(xScale))
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(6))

  let detailedColor = d3.scaleOrdinal()
    .domain(dotList.map((d, i) => i))
    .range(d3.schemePaired)
  // changes in different granularity
  dotList.reverse().forEach((res, i) => {
    let data = getDots(res.dots)
    // let data = res.dots.map(v => {return{
    //   'time': v.timeStart,
    //   'y': v.y
    // }})
    let line = d3.line()
      .x(d => xScale(d.time))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX)
    g.append('path')
      .datum(data)
      .style('fill', 'none')
      .style('stroke', granularityColor[i])
      .style('stroke-width', scatterLineWidth)
      .style('stroke-opacity', 0.3)
      .attr('d', line)
    g.append('g')
     .classed(`dots_${i}`, true)
     .selectAll('circle')
     .data(data)
     .enter()
     .append('circle')
     .attr('cx', d => xScale(d.time))
     .attr('cy', d => yScale(d.y))
     .attr('r', scatterRadius)
     .style('fill', granularityColor[i])
     .style('opacity', 0.6)
  })

  // title of the measure
  div
    .append('p')
    .classed('title', true)
    .text(title)
    .style('position', 'absolute')
    .style('top', '0.5vh')
    .style('left', '1vh')
}


let drawTimeLine = function () {
  let dg = window.dgraph
  let timeObjArray = dg.timeArrays.momentTime.map(v => v._d)
  let startTimeObj = timeObjArray[0]
  let endTimeObj = timeObjArray[timeObjArray.length - 1]
  let start

  start = Date.now()
  let intervals = getTimeIntervals(dg.timeArrays.momentTime, dg.getMinGranularity(), dg.getMaxGranularity())
  dg.timeArrays.intervals = intervals
  let nodeNumber = getProcessedData(dg, intervals, getNumberOfNodes)
  let linkPairNumber = getProcessedData(dg, intervals, getNumberOfLinkPairs)
  let linkNumber = getProcessedData(dg, intervals, getNumberOfLinks)
  let density = intervals.map((v, i) => {
    return {
      'granularity': v.granularity,
      'dots': linkPairNumber[i].dots.map(function (linkpair, idx) {
        let nodenumber = nodeNumber[i].dots[idx]
        let dense = 2 * linkpair.y / (nodenumber.y * (nodenumber.y - 1))
        return {
          'timeStart': linkpair.timeStart,
          'timeEnd': linkpair.timeEnd,
          'y': dense
        }
      })
    }
  })
  let activation = getProcessedData(dg, intervals, getActivation)
  let redundancy = getProcessedData (dg, intervals, getRedundancy)
  console.log(`Get Global Properties in ${Date.now()-start} ms`, density)


  // draw the time line
  let xScale = d3.scaleTime()
    .range([0, timelineWidth - margin.left - margin.right])
    .domain([startTimeObj, endTimeObj])

  drawCollapseTimeLine(1, nodeNumber, 'nodeNumber', 'Node Number', xScale)
  drawCollapseTimeLine(2, linkPairNumber, 'linkPairNumber', 'Link Pair Number', xScale)
  drawCollapseTimeLine(3, linkNumber, 'linkNumber', 'Link Number', xScale)
  drawCollapseTimeLine(4, density, 'density', 'Density', xScale)
  drawCollapseTimeLine(5, activation, 'activation', 'Global Activation', xScale)
  drawCollapseTimeLine(6, redundancy, 'redundancy', 'Global Redundancy', xScale)
}

let getProcessedData = function (dg, intervals, action) {
  return intervals.map((v, i) => {
    return {
      'granularity': v.granularity,
      'dots': action(dg, v.period)
    }
  })
}


export {drawTimeLine}
