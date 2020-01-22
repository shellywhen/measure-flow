import * as DataHandler from './dataHandler.js'
import * as Calculator from './measureCalculator.js'
const GRANULARITY_name_normal = ['milisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium']
let GRANULARITY_names = ['miliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years', 'decades', 'centuries', 'millenniums']
const GRANULARITY_NAME = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'year', 'year', 'year']
const GRANULARITY_name = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'decade', 'century', 'millennium']
const GRANULARITY_CONFIG = ['numeric', 'numeric', 'numeric', 'numeric', '2-digit', 'short', 'short', 'numeric', 'numeric', 'numeric', 'numeric']
const timeList = [1, 1000, 1000 * 60, 1000 * 60 * 60, 1000 * 60 * 60 * 24, 1000 * 60 * 60 * 24 * 7, 1000 * 60 * 60 * 24 * 30, 1000 * 60 * 60 * 24 * 365, 1000 * 60 * 60 * 24 * 30 * 12 * 10, 1000 * 60 * 60 * 24 * 30 * 12 * 100, 1000 * 60 * 60 * 24 * 30 * 12 * 1000]
const minHeight = window.innerHeight / 15
const paraList = ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years']
export let current = []
export let activeInterval = []
export let levelCount = 0
let dg
const PADDING = {
  top: 0,
  bottom: 10,
  left: 20,
  right: 0
}
const paddingRate = 0.1
let GLOBAL_ACTIVE_FRAME = null
let GLOBAL_ACTIVE_LABEL = null
let shiftSliderCallback = function() {
  if (!window.playerMode) return
  let shift = $('#config-shift').val();
  current[timeslotId].shift = shift
  current[timeslotId].flag = true
  networkcube.sendMessage('initGran', current[timeslotId])
}

let getDatum = function(val, granId, shift = 0) {
  let value = granId > 7 ? Math.pow(10, granId - 7) * val : val
  let para = granId > 7 ? 'years' : paraList[granId]
  let milisecond = moment(0).add(value, para)._d
  let label = GRANULARITY_name_normal[granId]
  let level = current.length
  let timeLabel = `${val%1==0?val:val.toFixed(2)} ${label}`
  let active = true
  let datum = {
    val,
    granId,
    value,
    level,
    para,
    milisecond,
    label,
    shift,
    level,
    timeLabel,
    active
  }
  return datum
}

let drawSpan = function(datum, shift = 0, border = 'gray') {
  networkcube.sendMessage('intervalSpan', datum)
  levelCount++
  let div = d3.select('#interval-selection-display')
  let identifier = 'userSpan'
  if (border != 'gray') {
    identifier = 'calendarSpan'
  }
  let span = div
    .append('span')
    .datum(datum)
    .attr('toggle', 0)
    .style('width', 'fit-content')
    .style('border-radius', '5px')
    .style('border', `0.8px ${border} solid`)
    .style('font-size', '0.95rem')
    .style('line-height', 2)
    .style('cursor', 'pointer')
    .classed(identifier, true)
    .classed(`span_level_${datum.level}`, true)
    .classed('chip', true)
    .classed('nodeList', true)
    .classed('mr-1', true)
    .text((d, i) => {
      let value = d.val % 1 == 0 ? d.val : d.val.toFixed(2)
      return ` ${value} ${d.label.capitalize()} `
    })
    .on('mouseover', function(d) {
      d3.selectAll(`.level_${d.level}`).selectAll('.bars').style('opacity', 1)
    })
    .on('mouseout', function(d) {
      let intervalSize = dg.timeArrays.intervals.length
      let opacity = getOpacity(d.level)
      // console.log('mouseout', d.level, getOpacity(d.level), d.timeLabel)
      d3.selectAll(`.level_${d.level}`).selectAll('.bars').style('opacity', opacity)
    })
    .on('click', function(d) {
      let ele = d3.select(this)
      let toggle = 1 - Number(ele.attr('toggle'))
      ele.attr('toggle', toggle)
      if (toggle) {
        d3.selectAll('.userSpan').style('border', `0.8px gray solid`)
        d3.selectAll('.calendarSpan').style('border', `0.8px lightblue solid`)
        ele.style('border', '0.8px orange solid')
        window.playerMode = true
        window.focusGranularity = d
        window.shiftMode = true
        d.flag = true
        let id = current.indexOf(datum)
        $('#config-shift').val(d.shift)
        window.timeslotId = id
        networkcube.sendMessage('initGran', d)
        return
      }
      ele.style('border', `0.8px ${border} solid`)
      window.playerMode = false
      window.focusGranularity = null
      $('#config-shift').val(0);
      d.flag = false
      networkcube.sendMessage('initGran', d)
    })
    .on('dblclick', function(d) {
      // delete this interval
      let level = d.level
      networkcube.sendMessage('intervalChange', {
        delete: [level],
        insert: [],
        fade: [],
        return: []
      })
    })
  // span.append('i')
  //   .classed('close', true)
  //   .classed('fas', true)
  //   .classed('fa-times', true)
  //   .style('font-size', 'small')
  //   .style('float', 'none')
  //   .on('click', function() {
  //     span.remove()
  //     let id = current.indexOf(datum)
  //     current.splice(id, 1)
  //   })
  return span
}

let addMoreIntervals = function(shift = 0, value, granularity, highlight = false) {
  let val = value || parseFloat($(`#interval-value-input`).val())
  let granId = granularity || Number($(`#granularity-selection`).val())
  let datum = getDatum(val, granId, shift)
  current.push(datum)
  activeInterval.push(datum)
  let span = drawSpan(datum, shift)
  let intervals = DataHandler.getSingleBins(granId, val, dg.timeArrays.momentTime, shift)
  window.measureIds.forEach((label, idx) => {
    let data = dg.selection.length > 0 ? dg.selection.map(v => Calculator.getSingleData(v.dgraph, intervals, label)) : [Calculator.getSingleData(dg, intervals, label)]
    networkcube.sendMessage('slotData', {
      data: data,
      flag: true,
      label: label,
      level: datum.level,
      milisecond: intervals['milisecond'],
      timeLabel: datum.timeLabel
    })
  })

  return span
}

let resetGlobalInterval = function() {
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

let restoreGlobalInterval = function() {
  dg.timeArrays.intervals = dg.timeArrays.defalutIntervals
  window.resetInterval()
}

let initDropdown = function() {
  d3.select(`#granularity-selection`)
    .selectAll('option')
    .remove()
  let data = []
  let len = dgraph.gran_max - dgraph.gran_min + 1
  let i = 0
  for (let gran = dgraph.gran_min; gran <= dgraph.gran_max; gran++) {
    let datum = getDatum(1, gran)
    datum.level = len - 1 - i
    data.push(datum)
    activeInterval.push(datum)
    drawSpan(datum, 0, 'lightblue')
    i++
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

let makeLines = function(g, data, xScale, yScale, labelData) {
  let yRange = yScale.range()
  let xRange = xScale.range()
  let h = yRange[0]
  let w = xRange[1]
  let layer = g
  layer.append('text').classed('approxTooltip', true).text('').style('fill', 'black').style('text-anchor', 'middle').style('font-size', 'x-small')
  layer.append('g').classed('labelTick', true).selectAll('line')
    .data(labelData)
    .enter()
    .append('line')
    .classed(`line_level_${levelCount}`, true)
    .attr('x1', d => xScale(d.frequency))
    .attr('x2', d => xScale(d.frequency))
    .attr('y1', 0)
    .attr('y2', h)
    .style('stroke', 'lightsteelblue')
    .style('stroke-dasharray', '3,1')
    .style('cursor', 'pointer')
    .on('click', function(d) {
      $(`#interval-value-input`).val(1)
      $(`#granularity-selection`).val(d.granularity)
      $('#addInputInterval').trigger('click')
    })
  layer.append('g').classed('labelText', true).selectAll('text')
    .data(labelData)
    .enter()
    .append('text')
    .attr('x', d => xScale(d.frequency) + 3)
    .attr('y', h + PADDING.bottom * 0.75)
    .text(d => d.label)
    .style('stroke-width', 3)
    .style('fill', 'black')
    .style('text-anchor', 'middle')
    .style('font-size', 'xx-small')

  layer.append('g').selectAll('line')
    .data(data)
    .enter()
    .append('line')
    .attr('x1', d => xScale(d.T))
    .attr('x2', d => xScale(d.T))
    .attr('y1', (d, i) => h / (data.length + 1) * i)
    .attr('y2', h)
    .style('stroke', 'black')
    .style('stroke-width', '0.1rem')
    .on('mouseover', function(d) {
      let x = xScale(d.T)
      if (w - x < 5) x -= 5
      else x += 5
      d3.select(this)
        .style('stroke', 'yellow')
        .style('stroke-width', '0.3rem')
      layer.select('.approxTooltip')
        .text(`${Number(d.value).toFixed(2)} ${GRANULARITY_names[d.granularity]}`)
        .attr('x', x)
        .attr('y', 8)
        .style('text-anchor', 'middle')
    })
    .on('mouseout', function(d) {
      d3.select(this)
        .style('stroke', 'black')
        .style('stroke-width', '0.1rem')
      layer.select('.approxTooltip').text('')
    })
    .on('click', function(d) {
      $(`#interval-value-input`).val(d.value)
      $(`#granularity-selection`).val(d.granularity)
      addMoreIntervals(d.shift)
    })
  layer.append('g').attr('transform', `translate(0,${h})`).classed('axis', true).call(d3.axisBottom(xScale)).selectAll('.tick').remove()
  let yAxis = layer.append('g').classed('axis', true).call(d3.axisLeft(yScale).ticks(1)).selectAll('text').style('font-size', 'xx-small').attr('x', -3)

}

let drawFFT = function(dataList) {
  const paddingRate = 0.1
  let h = minHeight - PADDING.top - PADDING.bottom
  let w = $('#fft-result-div').innerWidth() - PADDING.left - PADDING.right
  d3.select('#fft-result-div').style('height', minHeight * dataList.length + 10)
  let svg = d3.select('#fft-result-div').html('').append('svg').attr('width', w + PADDING.left + PADDING.right).attr('height', minHeight * dataList.length).append('g')
  let min_gran = dg.gran_min
  let max_gran = dg.gran_max
  let labelData = DataHandler.generateDateLabel(min_gran, max_gran)
  dataList.forEach(function(datum, idx) {
    let g = svg.append('g').attr('transform', `translate(${ PADDING.left},${minHeight*idx+PADDING.top})`)
    let linesG = g.append('g')
    linesG.append('line').attr('x1', -1).attr('x2', -1).attr('y1', 0).attr('y2', h).style('stroke', 'orange').classed('userInputLine', true)
    let canvas = g.append('g')
    let yDomain = d3.extent(datum, d => d.magnitude)
    let xDomain = d3.extent(datum, d => d.T)
    let yScale = d3.scaleLinear().domain([0, yDomain[1]]).range([h, 0])
    // let yScale = d3.scaleOrdinal().domain(datum.map(d => d.magnitude)).range([h,0])
    let xScale = d3.scaleLog().domain([1, xDomain[1] + 1000]).range([0, w])
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', w)
      .attr('height', h / 2)
      .style('pointer-events', 'all')
      .style('opacity', 0)
      .on('click', function() {
        let x = d3.mouse(this)[0]
        let milisecond = xScale.invert(x) * timeList[min_gran]
        let value = 0,
          granularity = 0
        for (let it = min_gran; it <= max_gran; it++) {
          if (milisecond > timeList[max_gran]) {
            value = milisecond / timeList[max_gran]
            granularity = max_gran
            break;
          }
          if (it != timeList.length - 1 && timeList[it] <= milisecond && timeList[it + 1] > milisecond) {
            value = milisecond / timeList[it]
            granularity = it
          }
        }
        linesG.append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', 0)
          .attr('y2', h)
          .style('stroke', 'gray')
          .classed('userInputLine', true)
          .classed(`line_rank_${levelCount}`, true)
        let span = addMoreIntervals(0, value, granularity)
        // let datum = getDatum(value, granularity, 0)
        // current.push(datum)
        // drawSpan(datum)
        //!!!!!!!!!!!!!!
        span.dispatch('click')
      })
      .on('mousemove', function() {
        let x = d3.mouse(this)[0]
        let y = d3.mouse(this)[1]
        let milisecond = xScale.invert(x) * timeList[min_gran]
        let value = 0,
          granularity = 0
        g.select('.userInputLine').attr('x1', x).attr('x2', x)
        for (let it = min_gran; it <= max_gran; it++) {
          if (milisecond > timeList[max_gran]) {
            value = milisecond / timeList[max_gran]
            granularity = max_gran
            break;
          }
          if (it != timeList.length - 1 && timeList[it] <= milisecond && timeList[it + 1] > milisecond) {
            value = milisecond / timeList[it]
            granularity = it
          }
        }
        $(`#interval-value-input`).val(value.toFixed(3))
        $(`#granularity-selection`).val(granularity)
        g.select('.approxTooltip')
          .text(`${Number(value).toFixed(2)} ${GRANULARITY_names[granularity]}`)
          .attr('x', x > w / 2 ? x - 2 : x + 5)
          .attr('y', y + 5)
          .style('text-anchor', x > w / 2 ? 'end' : 'start')
      })
      .on('mouseout', function() {
        g.select('.approxTooltip').text('').style('text-anchor', 'middle')
      })
    makeLines(canvas, datum, xScale, yScale, labelData)
  })

}

let handleFFT = function(m) {
  if (!m.body.flag) {
    GLOBAL_ACTIVE_FRAME = null
    d3.select('#fft-result-div').html('')
    return
  }
  let canvas = m.body.canvas
  let idx = m.body.index
  let label = m.body.label
  let fft = m.body.fft
  let min_gran = window.dgraph.gran_min
  let max_gran = window.dgraph.gran_max
  GLOBAL_ACTIVE_FRAME = idx
  GLOBAL_ACTIVE_LABEL = label
  fft.forEach(res => {
    res.forEach(d => {
      d.shift = -Math.atan2(d.phase[1], d.phase[0]) / Math.PI
      let milisecond = d.T * timeList[min_gran]
      for (let it = min_gran; it <= max_gran; it++) {
        if (milisecond > timeList[max_gran]) {
          d.value = milisecond / timeList[max_gran]
          d.granularity = max_gran
          break;
        }
        if (it != timeList.length - 1 && timeList[it] <= milisecond && timeList[it + 1] > milisecond) {
          d.value = milisecond / timeList[it]
          d.granularity = it
        }
      }
    })
  })
  drawFFT(fft)
}

let handleIntervalChange = function(m) {
  let config = m.body
  config.delete.forEach(function(level) {
    d3.select(`#form_toggle_level_${level}`).remove()
    d3.select(`.line_level_${level}`).remove()
    d3.select(`.span_level_${level}`).remove()
    d3.selectAll(`.level_${level}`).remove()
    for(let datum of current) {
      if(datum.level === level) {
        let active_id = activeInterval.indexOf(datum)
        activeInterval.splice(active_id, 1)
        datum.active = false
        break
      }
    }
  })
  config.fade.forEach(function(level) {
    for(let datum of current) {
      if(datum.level === level) {
        datum.active = false
        break
      }
    }
  })
  config.insert.forEach(function(level) {

  })
  config.return.forEach(function(level) {
    for(let datum of current) {
      if(datum.level === level) {
        datum.active = true
        break
      }
    }
  })
  networkcube.sendMessage('updateLayers', null)
}

let handleAddInputInterval = function(k) {
  let val = $(`#interval-value-input`).val()
  if (isNaN(val)) {
    alert('Please Input a Valid Number.')
    return
  }
  let shift = $('#config-shift').val()
  let span = addMoreIntervals(shift)
  span.dispatch('click')
}

function getTimeString (time, granularity) {
  let options = {}
  options[GRANULARITY_NAME[granularity]] = GRANULARITY_CONFIG[granularity]
  return GRANULARITY_name[granularity].capitalize() + ': ' + timeStart.toLocaleDateString('en-US', options) + ' ~ ' + timeEnd.toLocaleDateString('en-US', options)
}

function getMeasureList (level) {
  let options = {}
  let idx = current.map(v => v.level).indexOf(level)
  let final = []
  let initRow = ['id', 'timeStart', 'timeEnd', ...window.measureIds]
  final.push(initRow)
  let format = window.dgraph.currentData[window.measureIds[0]][idx]
  let granularity = format.granularity
  options[GRANULARITY_NAME[granularity]] = GRANULARITY_CONFIG[granularity]
  format.dots.forEach((row, i) => {
    let newRow = window.measureIds.map(id => window.dgraph.currentData[id][idx].dots[i].y)
    final.push([i, row.timeStart.toLocaleDateString('en-US', options), row.timeEnd.toLocaleDateString('en-US', options), ...newRow])
  })
  return final
}

function exportMeasure () {
  if(window.focusGranularity==null) {
    alert('Please select one interval.')
    return
  }
  let level = window.focusGranularity.level
  let list = getMeasureList(level)
  let csv = Papa.unparse(list)
  let csvContent = "data:text/csv;charset=utf-8," + csv
  let encodedUri = encodeURI(csvContent)
  let link = document.createElement('a')
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'export.csv')
  document.body.appendChild(link) // Required for FF
  link.click()
  link.parentNode.removeChild(link)
}

export function drawIntervalConfig(divId = 'config-interval', dgraph) {
  dg = dgraph
  let div = d3.select(`#${divId}`)
  let value = $(`#interval-value-input`)
  let granId = $(`#granularity-selection`)
  div.select('#interval-selection-display').html('')
  initDropdown()
  $(`#addInputInterval`).click(handleAddInputInterval)
  $(`#resetInterval`).click(resetGlobalInterval)
  $(`#restoreInterval`).click(restoreGlobalInterval)
  $(`#config-shift`).on('change', shiftSliderCallback)
  $(`#exportMeasure`).click(exportMeasure)
  networkcube.addEventListener('fft', handleFFT)
  networkcube.addEventListener('intervalChange', handleIntervalChange)
}
function sortArrayIndex(test) {
  return test.map((val, ind) => {return {ind, val}})
           .sort((a, b) => {return a.val > b.val ? 1 : a.val == b.val ? 0 : -1 })
           .map((obj) => obj.ind);
}

function getOpacity (level) {
  let currents = current.filter(v => v.active)
  let mili = currents.map(v => v.milisecond)
  let order = sortArrayIndex(mili).map(id => currents[id].level).reverse()
  let index = order.indexOf(level) +1
  return 0.2 + 0.6/currents.length * index
}
