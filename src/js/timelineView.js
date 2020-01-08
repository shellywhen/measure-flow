const timelineDivId = 'timelineFrame'
const timelineSvgId = 'timeline'
const timelineHeight = $('#' + timelineDivId).innerHeight()
const timelineWidth = $('#' + timelineDivId).innerWidth()
const timelineSvgHeight = timelineHeight * 0.25
const scatterRadius = 2
const scatterLineWidth = 2
const rectPadding = 0.1
const granularityColor = ['#E74C3C', '#8E44AD', 'blue', '#1ABC9C', '#16A085', '#F1C40F', '#F39C12', '#3498DB',' #800080' ]
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*365*10+2, 1000*60*60*24*36525, 1000*60*60*24*36523*10]
const margin = {
  'top': 5,
  'left': 35,
  'right': 25,
  'bottom': 20
}
let globalMeasureList = ['numberOfNodes', 'numberOfNodePairs', 'numberOfLinks', 'diameter', 'clusteringCoefficient']
let timeLineColor = ['silver', 'yellow', 'orange','green', 'teal', 'blue', 'navy', 'brown', 'red', 'maroon', 'fuchisia', 'purple']

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

let getNodeDuringInterval = function (dgraph, interval) {
  let nodes = new Set()
  for (let t = interval[0]; t < interval[1]; t ++) {
    dgraph.timeArrays.links[t].forEach(l => {
      nodes.add(dgraph.linkArrays.source[l])
      nodes.add(dgraph.linkArrays.target[l])
    })
  }
  return nodes
}

let getNeighborDuringInterval = function (dgraph, interval, node) {
  let nodes = []
  let neighbors = dgraph.nodeArrays.neighbors[node].serie
  for(let t = interval[0]; t < interval[1]; t ++) {
    if (t in neighbors) {
      neighbors[t].forEach(v => {
        nodes.push(v)
      })
    }
  }
  return new Set(nodes)
}

let getConnectedComponent = function (dgraph, interval) {
  let dots = []
  interval.forEach(itv => {
    let nodes = getNodeDuringInterval(dgraph, itv)
    let nodeList = Array.from(nodes)

    if (nodeList.length === 0) {
      dots.push(dataWrapper(dgraph, itv, 0))
      return
    }
    let flags = new Array(nodes.size).fill(false)
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
        let neighbors = [...getNeighborDuringInterval(dgraph, itv, nodeList[i])]
        neighbors.forEach(v => {
          if (!flags[map[v]]) {
            queue.push(map[v])
            component[map[v]] = component[i]
          }
        })
      }
    }
    let group = new Set()
    component.forEach((v, i) => {
      if (v != i) group.add(v)
    })
    dots.push(dataWrapper(dgraph, itv, group.size))
  })
  return dots
}

let getNumberOfNodes = function (dgraph, interval) {
   return interval.map(itv => {
    let nodes = getNodeDuringInterval(dgraph, itv)
    return dataWrapper(dgraph, itv, nodes.size)
  })
}

let getNumberOfLinkPairs = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    if(itv[0]==itv[1]) {
      dots.push(dataWrapper(dgraph, itv, 0))
      continue
    }
    let linkPairs = new Set()
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      dgraph.timeArrays.links[t].forEach(l => {
        linkPairs.add(dgraph.linkArrays.nodePair[l])
      })
    }
    dots.push(dataWrapper(dgraph, itv, linkPairs.size))
  }
  return dots
}

let getNumberOfLinks = function (dgraph, interval) {
  let dots = []
  for (let itv of interval) {
    if(itv[0]==itv[1]) {
      dots.push(dataWrapper(dgraph, itv, 0))
      continue
    }
    let sum = 0
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      dgraph.timeArrays.links[t].forEach(function (lid) {
          sum += d3.sum(Object.values(dgraph.linkArrays.weights[lid].serie))
      })
    }
    dots.push({'y': sum})
  }
  return dots
}

let getActivation = function (dgraph, interval) {
  let dots = []
  let linkList = dgraph.timeArrays.links
  let current = new Set ()
  interval.forEach(itv => {
    let nodes = getNodeDuringInterval(dgraph, itv)
    nodes.forEach(n => {current.add(n)})
    let value = current.size
    if(itv[1]==itv[0]) value = 0
    dots.push(dataWrapper(dgraph, itv, value))
  })
  return dots
}

let getRedundancy = function (dgraph, interval) {
  let dots = [dataWrapper(dgraph, interval[0], 0)]
  let linkList = dgraph.timeArrays.links
  let previous = getNodeDuringInterval(dgraph, interval[0])
  for (let i = 1; i < interval.length; i ++) {
    let current = getNodeDuringInterval(dgraph, interval[i])
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, interval[i], intersection.size))
    previous = current
  }
  return dots
}

let dataWrapper = function (dgraph, interval, y) {
  return {
    'y': y
  }
}

let getComingLinks = function (dgraph, interval) {
  let linkList = dgraph.timeArrays.links
  let previous = new Set()
  for (let t = interval[0][0]; t < interval[0][1]; t++) {
    linkList[t].forEach( l => {
      previous.add(dgraph.linkArrays.nodePair[l])
    })
  }
  let dots = [dataWrapper(dgraph, interval[0], previous.size)]
  for (let i = 1; i < interval.length; i ++) {
    let current = new Set()
    let itv = interval[i]
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.nodePair[l])
      })
    }
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, itv,  current.size - intersection.size))
    previous = current
  }
  return dots
}

let getLeavingLinks = function (dgraph, interval) {
  let linkList = dgraph.timeArrays.links
  let previous = new Set()
  for (let t = interval[0][0]; t < interval[0][1]; t++) {
    linkList[t].forEach( l => {
      previous.add(dgraph.linkArrays.nodePair[l])
    })
  }
  let dots = [dataWrapper(dgraph, interval[0], previous.size)]
  for (let i = 1; i < interval.length; i ++) {
    let current = new Set()
    let itv = interval[i]
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.nodePair[l])
      })
    }
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, itv,  previous.size - intersection.size))
    previous = current
  }
  return dots
}

let getVolatility = function (dgraph, interval) {
  let linkList = dgraph.timeArrays.links
  let previous = new Set()
  for (let t = interval[0][0]; t < interval[0][1]; t++) {
    linkList[t].forEach( l => {
      previous.add(dgraph.linkArrays.nodePair[l])
    })
  }
  let dots = [dataWrapper(dgraph, interval[0], previous.size)]
  for (let i = 1; i < interval.length; i ++) {
    let current = new Set()
    let itv = interval[i]
    for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
      linkList[t].forEach(l => {
        current.add(dgraph.linkArrays.nodePair[l])
      })
    }
    let intersection = new Set([...current].filter(x => previous.has(x)))
    dots.push(dataWrapper(dgraph, itv, current.size + previous.size - 2 * intersection.size))
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
  let tooltip = g.append('text')
    .attr('class', "tooltip")
    .style('opacity', 0);
  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${timelineSvgHeight - margin.top - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(8))
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(5))

  let detailedColor = d3.scaleOrdinal()
    .domain(dotList.map((d, i) => i))
    .range(d3.schemePaired)
  // changes in different granularity
  dotList.reverse().forEach((res, i) => {
    let data = res.dots
    g.selectAll('.bars')
      .data(data)
      .enter()
      .append('rect')
      .classed('bars', true)
      .attr('x', d => xScale(d.timeStart) + rectPadding * 2 * i)
      .attr('y', d => yScale(d.y))
      .attr('width', d => {
        let value = xScale(d.timeEnd) - xScale(d.timeStart) - rectPadding * 2 * i
        return xScale(d.timeEnd) - xScale(d.timeStart) - rectPadding * 2 * i
      })
      .attr('data', d => d.y)
      .attr('height', d => yScale(0) - yScale(d.y))
      .style('fill', timeLineColor[idx])
      .style('opacity', i / dotList.length + 1 / dotList.length)
      .style('stroke-width', Math.log(i*10))
      .on('mouseover', function (d) {
        let self = d3.select(this)
        let newX =  parseFloat(self.attr('x')) + parseFloat(self.attr('width')) / 2
        let newY =  parseFloat(self.attr('y')) - 5
        tooltip
          .attr('x', newX)
          .attr('y', newY)
          .text(self.attr('data'))
          .style('text-anchor', 'middle')
          .transition().duration(200)
          .style('opacity', 1)
      })
      .on('mouseout', d => {
        tooltip.transition().duration(200)
  				.style('opacity', 0)
      })

    g.append('g')
     .classed(`dots_${i}`, true)
     .selectAll('circle')
     .data(data)
     .enter()
     .append('circle')
     .attr('cx', d => xScale(d.timeStart))
     .attr('cy', d => yScale(d.y))
     .attr('r', scatterRadius)
     .style('fill', granularityColor[i])
     .style('opacity', 0)
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

  let intervals = dg.timeArrays.intervals

  // test part
  let nodeNumber = getProcessedData(dg, intervals, getNumberOfNodes)
  let linkPairNumber = getProcessedData(dg, intervals, getNumberOfLinkPairs)
  let linkNumber = getProcessedData(dg, intervals, getNumberOfLinks)
  let density = intervals.map((v, i) => {
    return {
      'granularity': v.granularity,
      'dots': linkPairNumber[i].dots.map(function (linkpair, idx) {
        let nodenumber = nodeNumber[i].dots[idx]
        let totalNode = dg.nodeArrays.length
        let totalPossible = totalNode * (totalNode - 1) / 2
        let currentPossible = nodenumber.y * (nodenumber.y - 1) / 2
        let dense = linkpair.y / totalPossible
        if (Number.isNaN(dense)) dense=0
        return {
          'timeStart': linkpair.timeStart,
          'timeEnd': linkpair.timeEnd,
          'y': dense
        }
      })
    }
  })
  let activation = getProcessedData(dg, intervals, getActivation)
  let redundancy = getProcessedData(dg, intervals, getRedundancy)
  let coming = getProcessedData(dg, intervals, getComingLinks)
  let leaving = getProcessedData(dg, intervals, getLeavingLinks)
  let volatility = getProcessedData(dg, intervals, getVolatility)
  let component = getProcessedData(dg, intervals, getConnectedComponent)


  // draw the time line
  let xScale = d3.scaleTime()
    .range([0, timelineWidth - margin.left - margin.right])
    .domain([new Date(dg.roundedStart), new Date(dg.roundedEnd)])

  drawCollapseTimeLine(1, nodeNumber, 'nodeNumber', 'Node Number', xScale)
  drawCollapseTimeLine(2, linkPairNumber, 'linkPairNumber', 'Link Pair Number', xScale)
  drawCollapseTimeLine(3, linkNumber, 'linkNumber', 'Link Number', xScale)
  drawCollapseTimeLine(4, density, 'density', 'Density', xScale)
  drawCollapseTimeLine(5, activation, 'activation', 'Global Activation', xScale)
  drawCollapseTimeLine(6, redundancy, 'redundancy', 'Global Redundancy', xScale)
  drawCollapseTimeLine(6, volatility, 'volatility', 'Global Volatility', xScale)
  drawCollapseTimeLine(7, component, 'connectedComponent', 'Connected Components', xScale)
}

export let getProcessedData = function (dg, intervals, action) {
  return intervals.map((v, i) => {
    let result = action(dg, v.period.map(m => m.interval))
    result.forEach((m, j) => {
      m.timeStart = v.period[j].x0
      m.timeEnd = v.period[j].x1
    })
    return {
      'granularity': v.granularity,
      'dots': result,
      'milisecond': v.milisecond
    }
  })
}
let getSingleNodeStat = function (dgraph, intervals, type) {
  return intervals.map((v, i) => {
    let interval = v.period.map(m => m.interval)
    let result = []
    for (let itv of interval) {
      let nodes = new Set()
      for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
        let links = dgraph.timeArrays.links[t]
        for(let lid of links) {
          let src = dgraph.linkArrays.source[lid]
          let dst = dgraph.linkArrays.target[lid]
          if (dgraph.nodeArrays.nodeType[src] === type) nodes.add(src)
          if (dgraph.nodeArrays.nodeType[dst] === type) nodes.add(dst)
        }
      }
      result.push(dataWrapper(dgraph, itv, nodes.size))
      result.forEach((m, j) => {
        m.timeStart = v.period[j].x0
        m.timeEnd = v.period[j].x1
      })
    }
    return {
      'granularity': v.granularity,
      'dots': result,
      'milisecond': v.milisecond
    }
  })

}
let getSingleLinkStat = function (dgraph, intervals, type) {
  return intervals.map((v, i) => {
    let interval = v.period.map(m => m.interval)
    let result = []
    for (let itv of interval) {
      let sum = 0
      for (let t = itv[0]; t < itv[1]; t ++) { // aggregation
        let links = dgraph.timeArrays.links[t]
        for(let lid of links) {
          let linkType = dgraph.linkArrays.linkType[lid]
          if (linkType === type) {
            // sum +=dgraph.linkArrays.weights[lid].serie[t]
            sum += 1
          }
        }
      }
      result.push(dataWrapper(dgraph, itv, sum))
    }
    result.forEach((m, j) => {
      m.timeStart = v.period[j].x0
      m.timeEnd = v.period[j].x1
    })
    return {
      'granularity': v.granularity,
      'dots': result,
      'milisecond': v.milisecond
    }
  })

}
export let getLinkStat= function (dgraph, intervals = dgraph.timeArrays.intervals, typeList  = dgraph.linkTypeArrays.names) {
  let res = {}
  typeList.forEach(typename => {
    let data = getSingleLinkStat(dgraph, intervals, typename)
    res[typename] = data
  })
  return res
}

export let getNodeStat = function (dgraph, intervals = dgraph.timeArrays.intervals, typeList  = dgraph.nodeTypeArrays.names) {
  let res = {}
  typeList.forEach(typename => {
    let data = getSingleNodeStat(dgraph, intervals, typename)
    res[typename] = data
  })
  return res
}

let getData = function (dgraph, intervals = [], measureList =  ['nodeNumber', 'linkNumber', 'linkPairNumber', 'density', 'activation', 'redundancy', 'coming', 'leaving', 'volatility', 'component']) {
  let dg = dgraph
  if (intervals.length === 0)  intervals = dg.timeArrays.intervals
  // test part
  let nodeNumber = getProcessedData(dg, intervals, getNumberOfNodes)
  let linkPairNumber = getProcessedData(dg, intervals, getNumberOfLinkPairs)
  let linkNumber = getProcessedData(dg, intervals, getNumberOfLinks)
  let density = intervals.map((v, i) => {
    return {
      'granularity': v.granularity,
      'dots': linkPairNumber[i].dots.map(function (linkpair, idx) {
        // let nodenumber = nodeNumber[i].dots[idx]
        let totalNode = dg.nodeArrays.activeNodes.length
        let totalPossible = totalNode * (totalNode - 1) /2
        // let currentPossible =  nodenumber.y * (nodenumber.y - 1) / 2
        let dense = linkpair.y / totalPossible
        if (Number.isNaN(dense)) dense = 0
        return {
          'timeStart': linkpair.timeStart,
          'timeEnd': linkpair.timeEnd,
          'y': dense
        }
      })
    }
  })
  let activation = getProcessedData(dg, intervals, getActivation)
  let redundancy = getProcessedData(dg, intervals, getRedundancy)
  let coming = getProcessedData(dg, intervals, getComingLinks)
  let leaving = getProcessedData(dg, intervals, getLeavingLinks)
  let volatility = getProcessedData(dg, intervals, getVolatility)
  let component = getProcessedData(dg, intervals, getConnectedComponent)
  return {
    nodeNumber: nodeNumber,
    linkPairNumber: linkPairNumber,
    linkNumber: linkNumber,
    density: density,
    activation: activation,
    redundancy: redundancy,
    coming: coming,
    leaving: leaving,
    volatility: volatility,
    component: component
  }
}

let getNodesDuring = function (startId, endId, dgraph) {
  let nodes = new Set()
  for (let t = startId; t <= endId; t ++) {
    dgraph.timeArrays.links[t].forEach(l => {
      nodes.add(dgraph.linkArrays.source[l])
      nodes.add(dgraph.linkArrays.target[l])
    })
  }
  return nodes
}

let getLinkPairsDuring = function (startId, endId, dgraph) {
  let linkPairs = new Set()
  for (let t = startId; t <= endId; t ++) {
    dgraph.timeArrays.links[t].forEach(l => {
       linkPairs.add(dgraph.linkArrays.nodePair[l])
    })
  }
  return linkPairs
}

let getLinkNumberDuring = function (startId, endId, dgraph) {
  let res = 0
  if(startId==endId) {
    return 0
  }
  let sum = 0
  for (let t = startId; t < endId; t ++) { // aggregation
    dgraph.timeArrays.links[t].forEach(function (lid) {
        sum += d3.sum(Object.values(dgraph.linkArrays.weights[lid].serie))
    })
  }
  return sum
}

let getComponentDuring =function (startId, endId, dgraph, nodes) {
  let nodeList = Array.from(nodes)
  if (nodeList.length === 0) {
    return 0
  }
  let flags = new Array(nodes.size).fill(false)
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
      let neighbors = [...getNeighborDuringInterval(dgraph, [startId, endId], nodeList[i])]
      neighbors.forEach(v => {
        if (!flags[map[v]]) {
          queue.push(map[v])
          component[map[v]] = component[i]
        }
      })
    }
  }
  let group = new Set()
  component.forEach((v, i) => {
    if (v != i) group.add(v)
  })
  return group.size
}

let getLinkTypesDuring = function (startId, endId, dgraph) {
  let result = {}
  dgraph.linkTypeArrays.name.forEach(name => {
    let sum = 0
    for (let t = startId; t <endId; t ++) { // aggregation
      dgraph.timeArrays.links[t].forEach(lid => {
        let linkType = dgraph.linkArrays.linkType[lid]
        if (linkType === name)
        sum += 1
         // sum += 1 d3.sum(Object.values(dgraph.linkArrays.weights[lid].serie))
      })
    }
    result[`linkType_${name}`] = sum
  })
  return result
}

let getNodeTypesDuring = function (startId, endId, dgraph) {
  let result = {}
  dgraph.nodeTypeArrays.name.forEach(name => {
    let nodes = new Set()
    for (let t = startId; t < endId; t ++) {
      let links = dgraph.timeArrays.links[t]
      for(let lid of links) {
        let src = dgraph.linkArrays.source[lid]
        let dst = dgraph.linkArrays.target[lid]
        if (dgraph.nodeArrays.nodeType[src] === type) nodes.add(src)
        if (dgraph.nodeArrays.nodeType[dst] === type) nodes.add(dst)
      }
    }
    result[`nodeType_${name}`] = nodes.size
  })
  return result
}

let getIntervalData = function (dgraph, startId, endId) {
  let prevNodes = getNodesDuring (0, Math.max(0, startId - 1), dgraph)
  let currNodes = getNodesDuring (startId, endId, dgraph)
  let prevPairs = getLinkPairsDuring (0, Math.max(0, startId - 1), dgraph)
  let currPairs = getLinkPairsDuring (startId, endId, dgraph)
  let intersectPairs = new Set([...currPairs].filter(x => prevNodes.has(x)))
  let nodeNumber = currNodes.size
  let linkNumber = getLinkNumberDuring(startId, endId, dgraph)
  let linkPairNumber = currPairs.size
  let tmp = 2 * linkPairNumber / (dgraph.nodeArrays.length * (dgraph.nodeArrays.length - 1))
  let density = Number.isNaN(tmp)? 0 : tmp
  let redundancy = new Set([...currNodes].filter(x => prevNodes.has(x))).size
  let activation = currNodes.size - redundancy
  let coming = currPairs.size - intersectPairs.size
  let leaving = prevPairs.size - intersectPairs.size
  let volatility = prevPairs.size + currPairs.size - 2 * intersectPairs.size
  let component = getComponentDuring (startId, endId+1, dgraph, currNodes)
  let result = {
    nodeNumber, linkNumber, linkPairNumber, density, redundancy, activation, coming, leaving, volatility, component
  }
  let linkTypes = getLinkTypesDuring (startId, endId+1, dgraph)
  Object.keys(linkTypes).forEach(k => {
    result[k] = linkTypes[k]
  })
  let nodeTypes = getNodeTypesDuring (startId, endId+1, dgraph)
  Object.keys(nodeTypes).forEach(k => {
    result[k] = linkTypes[k]
  })
  return result
}

export {drawTimeLine, getData, getIntervalData}
