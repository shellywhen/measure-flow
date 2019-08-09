let height
let width
let boxSvgId
let boxDivId
let svg
const color = d3.interpolateOranges
const margin = {
  'top': 5,
  'left': 35,
  'right': 35,
  'bottom': 4
}
let dgraph

export let drawBox = function (divId = 'boxFrame', svgId = 'boxSvg') {
  boxDivId = divId
  boxSvgId = svgId
  d3.select(`#${boxDivId}`).selectAll('svg').remove()
  let boxWidth = $(`#${boxDivId}`).innerWidth()
  let boxHeight = $(`#${boxDivId}`).innerHeight()
  width = boxWidth - margin.left - margin.right
  height = boxHeight - margin.top - margin.bottom
  svg = d3.select(`#${boxDivId}`).append('svg')
    .attr('height', boxHeight)
    .attr('width', boxWidth)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ','+ margin.top + ')')
  dgraph = window.dgraph
  let raw_data = getBoxData('degree', dgraph.timeArrays.intervals[0].period)
  let data = getQuartile(raw_data, 4, dgraph.timeArrays.intervals[0].period)
  let plotdata = plotData(data)
  plotBox(plotdata, data)


}
let plotData = function (data) {
  let result = []
  let lb = data.map(v => {
    return {
      y1: v.quartile[0],
      y0: v.percentage[0],
      x: v.time
    }})
  result.push(lb)
  let lh = data.map(v => {
    return {
      y0: v.quartile[4],
      y1: v.percentage[v.percentage.length - 1],
      x: v.time
    }
  })
  for (let i = 0; i < data[0].percentage.length - 1; i ++) {
    let tmp = data.map(v => {
      return {
        y0: v.percentage[i + 1],
        y1: v.percentage[i],
        x: v.time
      }
    })
    result.push(tmp)
  }
  result.push(lh)
  console.log(result)
  return result
}
let getQuartile = function (raw_data, k = 4, interval) {
  let dots = raw_data.map((data_pkg, tid) => {
    let data = data_pkg.map(d => d.size)
    let n = data.length
    let q1 = data[Math.floor(n / 4)]
    let q2 = data[Math.floor(2 * n / 4)]
    let q3 = data[Math.floor(3 * n / 4)]
    let iqr = q3 - q1
    let lb = Math.max(q1 - 1.5 * iqr, data[0])
    let hb = Math.min(q3 + 1.5 * iqr, data[data.length - 1])
    let result = {
      quartile: [lb, q1, q2, q3, hb],
      maximum: Math.max(data[data.length - 1], hb),
      outlier: [],
      percentage: [],
      size: data.length,
      k: k,
      time: dgraph.timeArrays.momentTime[interval[tid][0]]._d
    }
    for (let i = 0; data[i] < lb; i++) {
      result.outlier.push({'data': data[i], 'node': data_pkg[i].node})
    }
    for (let i = data.length - 1; data[i] > hb; i--) {
      result.outlier.push({'data': data[i], 'node': data_pkg[i].node})
    }
    for (let p = 1; p <= k - 1; p ++ ) {
      result.percentage.push(data[Math.floor(p * n / k)])
    }
    return result
  })
  return dots
}
let getBoxData = function (measure, interval) {
  if (measure === 'degree') return getDegreeDistribution(interval)
}
let getDegreeDistribution = function (interval) {
  let data = []
  interval.forEach(itv => {
    let list = []
    dgraph.nodeArrays.neighbors.forEach((node, nid) => {
      let neighbor = []
      for(let t = itv[0]; t <= itv[1]; t++) {
        if(t in node.serie) {
          neighbor.push(...node.serie[t])
        }
      }
      neighbor = new Set (neighbor)
      if(neighbor.size) list.push({size:neighbor.size, node:nid})
    })
    list.sort((a, b) => a.size - b.size)
    data.push(list)
  })
  return data
}

let plotBox = function (data, outlier) {
  let maxY = d3.max(outlier.map(v => v.maximum))
  const xScale = d3.scaleTime()
    .range([0, width])
    .domain([dgraph.timeArrays.momentTime[0]._d, dgraph.timeArrays.momentTime[dgraph.timeArrays.momentTime.length - 1]._d])
  const yScale = d3.scaleLinear()
    .range([height, 0])
    .domain([0, maxY])
//  let xaxis = svg.append('g').call(d3.axisTop(xScale).ticks(5))

  let yaxis = svg.append('g').call(d3.axisLeft(yScale).ticks(5))
  yaxis.select(".domain").remove()

 svg.append('g')
   .selectAll('.snapshot')
   .data(dgraph.timeArrays.momentTime)
   .enter()
   .append('line')
   .style('stroke', '#E2E6EA')
   .classed('snapshot', true)
   .attr('x1', d => xScale(d._d))
   .attr('x2', d => xScale(d._d))
   .attr('y1', margin.top)
   .attr('y2', height)

let totalPath = data.length
 data.forEach((datum, i) => {
   svg.append('path')
     .datum(datum)
     .style('fill', color((i + 0.5)/totalPath))
     .style('opacity', 0.8)
     .style('stroke', '#ff8c00')
     .style('stroke-width', 0.5)
     .attr('d', d3.area()
     .curve(d3.curveCardinal)
     .x(d => xScale(d.x))
     .y0(d => yScale(d.y0))
     .y1(d => yScale(d.y1))
   )
 })
let g = svg.append('g')
outlier.forEach(v => {
  v.outlier.forEach(o => {
    g.append('circle')
      .attr('r', 2)
      .attr('cx', xScale(v.time))
      .attr('cy', yScale(o.data))
      .style('stroke', 'black')
      .on('mouseover', d => {
        networkcube.sendMessage('hint', {'nodes': [o.node], action: 'add'})
        console.log('hover!', o.node)
      } )
      .on('mouseout', d => {
        networkcube.sendMessage('hint', {'nodes': [o.node], action: 'delete'})
      })
  })
})

}
