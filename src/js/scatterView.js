const scatterDivId = 'scatterFrame'
const scatterSvgId = 'scatter'
const divHeight = $('#' + scatterDivId).innerHeight()
const divWidth = $('#' + scatterDivId).innerWidth() - 20
const margin = {
  'top': 30,
  'left': 60,
  'right': 40,
  'bottom': 60
}
const scatterHeight = divHeight - margin.top - margin.bottom
const scatterWidth = divWidth - margin.left - margin.right
const scatterRadius = 4
const scatterLineWidth = 3
const multipleSVGHeight = 40
const multipleSVGWidth = divWidth / 2
const multipleMargin = {'top': 5, 'left': 25, 'right': 5, 'bottom':5}
const multipleWidth = multipleSVGWidth - multipleMargin.left - multipleMargin.right
const multipleHeight = multipleSVGHeight  - multipleMargin.top - multipleMargin.bottom
const localMeasureList = ['degree', 'activation', 'redundancy', 'volatility', 'clutering coefficient']
// const colors = d3.schemeSet3
const colors = ['orange','green', 'teal', 'lightblue', 'blue', 'navy', 'brown', 'red', 'maroon', 'fuchisia', 'purple']
const options = {year: 'numeric', month: 'short', day: 'numeric' }

let updateScatter = function () {
    let dg = window.dgraph
    let nodes = Array.from(dg.nodeSelection)
    let xType = $('#xaxis').val()
    let yType = $('#yaxis').val()
    let granularityIdx = $('#granularity').val()
  //  console.log(xType, yType, granularityIdx)
    let interval =  dg.timeArrays.intervals[granularityIdx].period
    let times = interval.map(v => [
      dg.timeArrays.momentTime[v[0]]._d,
      dg.timeArrays.momentTime[v[1]]._d
    ])
    let maxx = 0
    let maxy = 0
    let start = Date.now()
    let values = nodes.map((v, i) => {
      let xs = getMeasure(v, xType, interval)
      let ys = getMeasure(v, yType, interval)
      maxx = Math.max(maxx, d3.max(xs))
      maxy = Math.max(maxy, d3.max(ys))
      let arr = times.map(function(t, ti) {
        return {
          'x': xs[ti],
          'y': ys[ti],
          't': t
        }
      })
      return {
        'id': v,
        'values': arr
      }
    })
    let startTimeObj = times[0][0]
    let endTimeObj = times[times.length - 1][1]
    makeScatter(values, maxx, maxy)
    makeMultiple(values, maxx, maxy, [startTimeObj, endTimeObj], {'x': xType, 'y': yType})
    console.log(`Scatter Plot in ${Date.now() - start} ms`, values)
}

let makeMultiple = function (values, maxx, maxy, times, label) {
  const labelHeight = 15
  let nodeNum = values.length
  $('#smallMultiple').html('')
  let svgWhole = d3.select('#smallMultiple')
    .attr('width', divWidth)
    .attr('height', nodeNum * multipleSVGHeight + labelHeight)

  svgWhole.append('text')
    .attr('x', divWidth / 4)
    .attr('y', labelHeight)
    .text(label.x)
    .style('font-size', '0.8rem')
    .style('text-anchor', 'middle')

  svgWhole.append('text')
    .attr('x', 3 * divWidth / 4)
    .attr('y', labelHeight)
    .text(label.y)
    .style('font-size', '0.8rem')
    .style('text-anchor', 'middle')

  let svg = svgWhole.append('g')
    .attr('transform', `translate(0, ${labelHeight})`)

  let xg = svg.append('g')
    .attr('transform', `translate(${multipleMargin.left}, ${multipleMargin.top})`)

  let yg = svg.append('g')
    .attr('transform', `translate(${multipleSVGWidth + multipleMargin.left}, ${multipleMargin.top})`)

  let xScale = d3.scaleTime()
    .range([0, multipleWidth])
    .domain(times)

  let yScalex = d3.scaleLinear()
    .range([multipleHeight, 0])
    .domain([0, maxx])

  let yScaley = d3.scaleLinear()
    .range([multipleHeight, 0])
    .domain([0, maxy])

  values.forEach((v, i) => {
    let canvasx = xg.append('g')
      .attr('transform', `translate(0, ${i * multipleSVGHeight})`)
    let canvasy = yg.append('g')
     .attr('transform', `translate(0, ${i * multipleSVGHeight})`)
    multiplePlot(i, canvasx, v, xScale, yScalex, 'x')
    multiplePlot(i, canvasy, v, xScale, yScaley, 'y')
  })

}

let multiplePlot = function (i, g, value, xScale, yScale, identifier) {
  let data = value.values
  // g.append('g')
  //     .classed('x-axis', true)
  //     .attr('transform', `translate(0, ${multipleHeight})`)
  //     .call(d3.axisBottom(xScale).ticks(2))
  g.append('g')
     .classed('y-axis', true)
     .call(d3.axisLeft(yScale).ticks(2))
   let line = d3.line()
     .x(d => xScale(d.t[0]))
     .y(d => yScale(d[identifier]))
     .curve(d3.curveStepBefore)
   g.append('path')
     .datum(data)
     .style('fill', 'none')
     .style('stroke', colors[i])
     .style('stroke-width', scatterLineWidth)
     .style('stroke-opacity', 0.7)
     .attr('d', line)

   g.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.t[0]))
    .attr('cy', d => yScale(d[identifier]))
    .attr('r', scatterRadius)
    .style('fill', colors[i])
    .style('opacity', 0.6)
    .on('mouseover', mouseOverMultiple)
    .on('mouseout', scatterNodeOutHover)
}

let makeScatter = function (values, maxx, maxy) {
  $('#scatter').html('')
  let svg = d3.select('#scatter')
    .attr('width', divWidth)
    .attr('height', divHeight)
  let g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
  let xScale = d3.scaleLinear()
    .range([0, scatterWidth])
    .domain([0, maxx])

  let yScale = d3.scaleLinear()
    .range([scatterHeight, 0])
    .domain([0, maxy])

  g.append('g')
    .classed('x-axis', true)
    .attr('transform', `translate(0, ${scatterHeight})`)
    .call(d3.axisBottom(xScale).ticks(5))
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale).ticks(5))

  values.forEach((v, i) => {
    let line = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveCardinal)
    g.append('path')
      .datum(v.values)
      .style('fill', 'none')
      .style('stroke', colors[i])
      .style('stroke-width', scatterLineWidth)
      .style('stroke-opacity', 0.7)
      .attr('d', line)

    g.append('g')
     .classed(`line`, true)
     .selectAll('circle')
     .data(v.values)
     .enter()
     .append('circle')
     .attr('cx', d => xScale(d.x))
     .attr('cy', d => yScale(d.y))
     .attr('r', scatterRadius)
     .style('fill', colors[i])
     .style('opacity', 0.6)
     .on('mouseover', scatterNodeOnHover)
     .on('mouseout', scatterNodeOutHover)
  })
}

let scatterNodeOnHover = function (d) {
  let start = d.t[0].toLocaleDateString('en-US', options)
  let end = d.t[1].toLocaleDateString('en-US', options)
  tooltip.transition()
    .duration(200)
    .style('opacity', .9)
  tooltip.html(`&nbsp;${start}</br>-${end}`)
    .style('left', (d3.event.pageX) + 'px')
    .style('top', (d3.event.pageY - 28) + 'px')
}

let scatterNodeOutHover = function (d) {
  tooltip.transition()
    .duration(500)
    .style('opacity', 0)
}

let getMeasure = function (node, measure, interval) {
  switch (measure) {
    case 'degree':
      return getDegree(node, interval)
    case 'activation':
      return getActivation(node, interval)
    case 'volatility':
      return getVolatility(node, interval)
    case 'redundancy':
      return getRedundancy(node, interval)
    case 'clutering coefficient':
      return getClusteringCoefficient(node, interval)
  }
}

let getDegree = function (node, interval) {
  let results = []
  let neighbors = dgraph.nodeArrays.neighbors[node].serie
  for (let itv of interval) {
    let connected = []
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      if (t in neighbors) {
        connected.push(...neighbors[t])
      }
    }
    let stat = new Set(connected)
    results.push(stat.size)
  }
return results
}

let getClusteringCoefficient = function (node, interval) {
  let results = []
  let neighborList = dgraph.nodeArrays.neighbors[node].serie
  let timeArray = dgraph.timeArrays.links
  let targetList = dgraph.linkArrays.target
  let sourceList = dgraph.linkArrays.source
  interval.forEach(itv => {
    let neighbor = []
    let link = []
    let counter = 0
    for (let t = itv[0]; t <= itv[1]; t++) {
      if (t in neighborList) neighbor.push(...neighborList[t])
      link.push(...timeArray[t])
    }
    neighbor = [... new Set(neighbor)]
    link = [... new Set(link)]
    link.forEach(lid => {
      if (targetList[lid] in neighbor && sourceList[lid] in neighbor) counter ++
    })
    let coeff = 2 * counter  / (neighbor.length * (neighbor.length - 1))
    if(Number.isNaN(coeff)) coeff = 0
    results.push(coeff)
  })
    return results
}

let getVolatility = function (node, interval) {

}
let getActivation = function (node, interval) {
   let neighborList = dgraph.nodeArrays.neighbors[node].serie
   let previous = new Set()
   for (let tid = interval[0][0]; tid <= interval[0][1]; tid ++) {
     if(tid in neighborList) {
        neighborList[tid].forEach(v => {previous.add(v)})
     }
   }
   let results = [previous.size]
   for (let itv = 1; itv < interval.length; itv ++) {
     let current = new Set()
     for (let tid = interval[itv][0]; tid <= interval[itv][1]; tid ++) {
       if(tid in neighborList) {
           neighborList[tid].forEach(v => {current.add(v)})
       }
     }
     let diff = new Set([...current].filter(x => !previous.has(x)))
     results.push(diff.size)
     previous = current
   }
   return results
}
let getRedundancy = function (node, interval) {
   let neighborList = dgraph.nodeArrays.neighbors[node].serie
   let previous = new Set()
   for (let tid = interval[0][0]; tid <= interval[0][1]; tid ++) {
     if(tid in neighborList) {
        neighborList[tid].forEach(v => {previous.add(v)})
     }
   }
   let results = [0]
   for (let itv = 1; itv < interval.length; itv ++) {
     let current = new Set()
     for (let tid = interval[itv][0]; tid <= interval[itv][1]; tid ++) {
       if(tid in neighborList) {
           neighborList[tid].forEach(v => {current.add(v)})
       }
     }
     let intersection = new Set([...current].filter(x => previous.has(x)))
     results.push(intersection.size)
     previous = current
   }
   return results
}
let tooltip = d3.select('.tooltip')
let mouseOverMultiple = function (d) {
  let start = d.t[0].toLocaleDateString('en-US', options)
  let end = d.t[1].toLocaleDateString('en-US', options)
  let content = `x: ${d.x} y: ${d.y}</br>${start}-${end}`
  if(start === end) {
    content = `x: ${d.x} y: ${d.y}</br>${start}`
  }
  tooltip.transition()
    .duration(200)
    .style('opacity', .9)
  tooltip.html(content)
    .style('font-size', '0.8rem')
    .style('left', (d3.event.pageX) + 'px')
    .style('top', (d3.event.pageY - 40) + 'px')
}
export {updateScatter,localMeasureList}
