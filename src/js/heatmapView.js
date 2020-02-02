let dgraph
let heatmapDivId
let heatmapHeight
let heatmapWidth
let heatmapSvgHeight
let heatmapSvgWidth
const color = d3.interpolateOranges
let getDegree = function () {
return 0
}
const margin = {
  'top': 5,
  'left': 5,
  'right': 0,
  'bottom': 8
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
let getBins = function (data) {
  let maximum = d3.max(data.map(d => d3.max(d, v => v.size)))
  let minimum = d3.min(data.map(d => d3.min(d, v => v.size)))
  let grid = Array(data.length).fill().map(() => Array(maximum - minimum + 1).fill(0));
  data.forEach((t, i) => {
    t.forEach(d => {
      let value = d.size - minimum
      grid[i][value] ++
    })
  })
  let result = []
  grid.forEach((row, i) => {
    row.forEach((v, j) => {
      result.push({
        x: i,
        y: j + minimum,
        value: v
      })
    })
  })
return result
}

let plotHeatmap = function (data, interval, maximum, minimum) {
  let maxValue = d3.max(data, d=>d.value)
  let svg = d3.select(`#${heatmapDivId}`)
    .append('svg')
    .attr('height', heatmapHeight)
    .attr('width', heatmapWidth)
    .append('g')
    .attr('transform', `translate(${heatmapWidth*0.13+margin.left}, ${margin.top})`)
  let groups = new Array(interval.length).fill(0)
  for (let group in groups) groups[group] = group
  let bins = new Array(maximum - minimum + 1).fill(0)
  for (let bin in bins) bins[bin] = String(Number(minimum) + Number(bin))
  let xScale = d3.scaleBand().range([0, heatmapSvgWidth]).domain(groups).padding(0.01)
  let yScale = d3.scaleBand().range([heatmapSvgHeight, 0]).domain(bins).padding(0.01)
  svg.append('g').call(d3.axisLeft(yScale).tickValues(yScale.domain().filter(function(d,i){ return (d%5===0)})))
  svg.selectAll('.blocks')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => xScale(d.x))
    .attr('y', d => yScale(d.y))
    .attr('height', d => yScale.bandwidth())
    .attr('width', d => xScale.bandwidth())
    .style('fill', d => {
      return color(d.value / maxValue)
    })
    .on('mouseover', function (d) {
      if(d.value === 0) return
      let self = d3.select(this)
      let newX =  parseFloat(self.attr('x')) + parseFloat(self.attr('width')) / 2
      let newY =  parseFloat(self.attr('y')) - parseFloat(self.attr('height'))
      tooltip
        .attr('x', newX)
        .attr('y', newY)
        .text(d.value)
        .transition().duration(200)
        .style('opacity', 1)
    })
    .on('mouseout', function (d) {
      tooltip.transition().duration(200)
        .style('opacity', 0);
    })
  let tooltip = svg.append('text')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('text-anchor', 'middle')
      .style('font-size', '0.8rem')
}

let nodeDegree = function (dgraph, data, interval) {
  let total = dgraph.nodeArrays.length
  let lines = []
  for(let i = 0; i<total; i++) lines.push(new Array(interval.length).fill(0))
  data.forEach((datum,i)=>{
    datum.forEach((d => {
      lines[d.node][i] = d.size
    }))
  })
  return lines
}

export let drawHeatmap = function (divId = 'heatmapFrame') {
  heatmapDivId = divId
  heatmapHeight = $(`#${divId}`).innerHeight()
  heatmapWidth = $(`#${divId}`).innerWidth()
  heatmapSvgWidth = heatmapWidth*0.83 - margin.left - margin.right
  heatmapSvgHeight = heatmapHeight - margin.top - margin.bottom
  dgraph = window.dgraph
  let interval = dgraph.timeArrays.intervals[0].period.map(v => v.interval)
  let data = getDegreeDistribution(interval)
  let shareData = nodeDegree (dgraph, data, interval)
  let bins = getBins(data)
  let maximum = d3.max(data.map(d => d3.max(d, v => v.size)))
  let minimum = d3.min(data.map(d => d3.min(d, v => v.size)))
  plotHeatmap(bins, interval, maximum, minimum)
  return shareData
}
