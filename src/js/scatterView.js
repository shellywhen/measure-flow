const scatterDivId = 'scatterFrame'
const scatterSvgId = 'scatter'
const divHeight = $('#' + scatterDivId).innerHeight()
const divWidth = $('#' + scatterDivId).innerWidth() - 20
const margin = {
  'top': 10,
  'left': 30,
  'right': 40,
  'bottom': 20
}
const scatterHeight = divHeight - margin.top - margin.bottom
const scatterWidth = divWidth - margin.left - margin.right
const scatterRadius = 4
const scatterLineWidth = 3
const localMeasureList = ['degree', 'activation', 'redundancy', 'volatility']
const colors = d3.schemeSet3
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
      dgraph.timeArrays.momentTime[v[0]]._d,
      dgraph.timeArrays.momentTime[v[1]]._d
    ])
    let maxx = 0
    let maxy = 0
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
    console.log('Scatter Plot values', values)
    makeScatter(values, maxx, maxy)
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
    .call(d3.axisBottom(xScale))
  g.append('g')
   .classed('y-axis', true)
   .call(d3.axisLeft(yScale))

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
  let start = d.t[0].toLocaleDateString("en-US", options)
  let end = d.t[1].toLocaleDateString("en-US", options)
  tooltip.transition()
    .duration(200)
    .style("opacity", .9)
  tooltip.html(`&nbsp;${start}</br>-${end}`)
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px")
}

let scatterNodeOutHover = function (d) {
  tooltip.transition()
    .duration(500)
    .style("opacity", 0)
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
  }
}

let getDegree = function (node, interval) {
  let results = []
  for (let itv of interval) {
    let neighbors = new Set()
    for (let t = itv[0]; t <= itv[1]; t ++) { // aggregation
      let links = dgraph.timeArrays.links[t]
      for (let l of links) {
        if (node == dgraph.linkArrays.source[l]) {
          neighbors.add(dgraph.linkArrays.target[l])
        }
        else if (node == dgraph.linkArrays.target[l]) {
          neighbors.add(dgraph)
        }
      }
    }
    results.push(neighbors.size)
  }
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
   console.log('neighborList', neighborList, typeof neighborList, 21 in neighborList)
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
       console.log('iterate', tid)
       if(tid in neighborList) {
           console.log('if', node, tid)
           neighborList[tid].forEach(v => {current.add(v)})
       }
     }
     let diff = new Set([...current].filter(x => previous.has(x)))
     console.log(previous, current)
     results.push(diff.size)
     previous = current
   }
   return results
}

let tooltip = d3.select('.tooltip')
export {updateScatter,localMeasureList}
