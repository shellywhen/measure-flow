import * as DataHandler from './dataHandler.js'
const GRANULARITY_name_normal = ['milisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium']
const paraList = ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years']
let current = []
let dg

let getDatum = function (val, granId) {
  let value = granId > 7? Math.pow(10, granId - 7) * val : val
  let para = granId > 7? 'years' : paraList[granId]
  let milisecond = moment(0).add(value, para)._d
  let label = GRANULARITY_name_normal[granId]
  let datum = {val, granId, value, para, milisecond, label}
  return datum
}

let drawSpan = function (datum) {
  let div = d3.select('#interval-selection-display')
  let span = div
    .append('span')
    .datum(datum)
    .style('width', 'fit-content')
    .style('border-radius', '5px')
    .style('border', '0.5px gray solid')
    .style('font-size', '0.8rem')
    .style('line-height', 2)
    .style('cursor', 'pointer')
    .classed('chip', true)
    .classed('nodeList', true)
    .classed('mr-1', true)
    .text( (d,i) => {
      return ` ${d.val} ${d.label.capitalize()} `
    })
    .on('mouseover', function (d) {
      d3.selectAll(`.level_${d.level}`).selectAll('.bars').style('opacity', 1)
    })
    .on('mouseout', function (d) {
      let intervalSize = dg.timeArrays.intervals.length
      let opacity =  (d.level + 1) / intervalSize
      d3.selectAll(`.level_${d.level}`).selectAll('.bars').style('opacity', opacity)
    })
  span.append('i')
    .classed('close', true)
    .classed('fas', true)
    .classed('fa-times', true)
    .style('font-size', 'small')
    .style('float', 'none')
    .on('click', function() {
      span.remove()
      let id = current.indexOf(datum)
      current.splice(id, 1)
    })
}

let addMoreIntervals = function () {
  let val = parseFloat($(`#interval-value-input`).val())
  let granId = Number($(`#granularity-selection`).val())
  let datum = getDatum(val, granId)

  current.push(datum)
  drawSpan(datum)
}

let resetGlobalInterval = function () {
  current.sort((a, b) => {
    if (a.milisecond < b.milisecond) return -1
    if (a.milisecond > b.milisecond) return 1
    return 0
  })
  let len = current.length
  current.forEach((v, i) => {
    v.level = len - i - 1
  })
  let bins = current.map(d => DataHandler.getSingleBins(d.granId, d.val, dg.timeArrays.momentTime))
  dg.timeArrays.intervals = bins
  window.resetInterval()
}

let restoreGlobalInterval = function () {
  dg.timeArrays.intervals = dg.timeArrays.defalutIntervals
  window.resetInterval()
}

let initDropdown = function () {
    d3.select(`#granularity-selection`)
      .selectAll('option')
      .remove()
    let data = []
    let len = dgraph.gran_max - dgraph.gran_min + 1
    let i = 0
    for (let gran = dgraph.gran_min; gran <= dgraph.gran_max; gran ++) {
      let datum = getDatum(1, gran)
      datum.level = len - i - 1
      data.push(datum)
      drawSpan(datum)
      i ++
    }
    current = data
   d3.select(`#granularity-selection`)
      .selectAll('option')
      .data(data)
      .enter()
      .append('option')
      .property('value', d => d.granId)
      .text(d => d.label)
}


export function drawIntervalConfig(divId = 'config-interval', dgraph) {
  dg = dgraph
  let div = d3.select(`#${divId}`)
  let value = $(`#interval-value-input`)
  let granId =$(`#granularity-selection`)
  initDropdown()
  $(`#addInputInterval`).click(addMoreIntervals)
  $(`#resetInterval`).click(resetGlobalInterval)
  $(`#restoreInterval`).click(restoreGlobalInterval)
}
