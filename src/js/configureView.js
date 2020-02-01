import * as NodeLink from './nodelinkView.js'
// import * as Scatter from './scatterView.js'
import * as Measure from './measureView.js'
import * as Constant from './constant.js'
let addStyleConfig = function(divId, title, callback, min = 0, max = 3, value = 1, step = 0.01) {
  let div = d3.select(`#${divId}`)
    .append('div')
    .classed('slidecontainer', true)
  div.append('p')
    .style('margin-bottom', '-2vh')
    .text(title)

  div.append('input')
    .attr('type', 'range')
    .attr('step', step)
    .attr('min', min)
    .attr('max', max)
    .attr('value', value)
    .classed('slider', true)
    .attr('id', divId)
    .on('input', function() {
      callback(this.value)
    })
  return div
}

let changeHeight = function(x) {
  Measure.changeSVGHEIGHT(x)
  Measure.FRAME_INFO.forEach(frame => {
    frame.reScale()
  })
}

let changeNodeSize = function(x) {
  d3.selectAll('.nodes')
    .attr('r', d => x * NodeLink.getNodeRadius(d))
  d3.selectAll('.back-nodes')
    .attr('r', d => x * 1)
}

let changeLinkWidth = function(x) {
  d3.selectAll('.links')
    .style('stroke-width', d => x * NodeLink.getLineStroke(d))
}

let changeLinkOpacity = function(x) {
  d3.selectAll('.links')
    .style('stroke-opacity', x)
}

let changeEdgeGap = function(x) {
  networkcube.sendMessage('gap', x)
}

let changeEdgeBackground = function(x) {
  d3.selectAll('.links')
    .style('fill-opacity', x)
}

let changeBandWidth = function(x) {
  let timeDelta = networkcube.getDynamicGraph().timeDelta
  let day = 2 * x * timeDelta / (1000 * 24 * 60 * 60)
  let hour = 2 * x * timeDelta / (1000*60*60)
  let minute = 2 * x * timeDelta / (1000 * 60)
  d3.select('#bandwidthHint').text(function() {
    if (day > 1) return day.toFixed(0)
    else if(hour > 1) return hour.toFixed(1)
    else return minute.toFixed(1)
  })
  d3.select('#bandwidthUnit').text(function() {
    if (day > 1) return ' days'
    else if (hour > 1) return ' hours'
    else return ' minutes'
  })
  networkcube.sendMessage('bandwidth', x)
}

let handleSearchResult = function(m) {
  console.log('Get Search Result', m)
}
let addScatterConfig = function(granList, localMeasureList) {
  d3.selectAll('select')
    .classed('p-0', true)
    .style('height', '3.5vh')

  d3.select('#granularity')
    .selectAll('option')
    .data(granList)
    .enter()
    .append('option')
    .attr('value', function(d, i) {
      return i
    })
    .text(d => d)

  d3.select('#xaxis')
    .selectAll('option')
    .data(localMeasureList)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d)

  d3.select('#yaxis')
    .selectAll('option')
    .data(localMeasureList)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d)
}
let addBandwidthConfig = function(timeDelta) {
  let div = addStyleConfig('config-style', 'Bandwidth', changeBandWidth, 0, 3, 1, 0.005)
  let bandwidth = Measure.BANDWIDTH
  let day = timeDelta * bandwidth / (1000 * 60 * 60 * 24)
  let hour = timeDelta * bandwidth / (1000 * 60 * 60)
  let minute = timeDelta * bandwidth / (1000 * 60)
  let text = div.append('p')
    .classed('m-0', true)
    .text('≈ ')
  text.append('span')
    .attr('id', 'bandwidthHint')
    .text(function() {
      if (hour < 1) return minute.toFixed(1)
      else if (day < 1) return hour.toFixed(1)
      else return day.toFixed(0)
    })
  text.append('span')
    .attr('id', 'bandwidthUnit')
    .text(function() {
      if (hour < 1) return ' minutes'
      else if (day < 1) return ' hours'
      else return ' days'
    })
}
let addDivToggle = function(divId = 'config-view', checkboxId, name, linkDiv, flag = false) {
  let id = `checkbox_${checkboxId}`
  let div = d3.select(`#${divId}`)
    .append('div')
    .classed('form-check', true)
    .attr('id', `form_${checkboxId}`)
  div.append('input')
    .attr('type', 'checkbox')
    .classed('form-check-input', true)
    .attr('id', id)
    .attr('name', checkboxId)
    .attr('value', checkboxId)
  let label = div.append('label')
    .classed('form-check-label', true)
    .attr('for', checkboxId)
    .text(name)
  $(`#${id}`).prop('checked', true);
  $(`#${id}`).change(function() {
    let frame = d3.selectAll(`${linkDiv}`)
    if (this.checked) {
      frame.style('display', '')
      if (flag) {
        let level = parseInt(linkDiv.substring(7))
        networkcube.sendMessage('intervalChange', {
          delete: [],
          insert: [],
          fade: [],
          return: [level]
        })
      }
    } else {
      frame.style('display', 'none')
      if (flag) {
        let level = parseInt(linkDiv.substring(7))
        networkcube.sendMessage('intervalChange', {
          delete: [],
          insert: [],
          fade: [level],
          return: []
        })
      }
    }
  })
  if (flag) {
    label.on('dblclick', function() {
      let level = parseInt(linkDiv.substring(7))
      d3.selectAll(`${linkDiv}`).remove()
      networkcube.sendMessage('intervalChange', {
        delete: [level],
        insert: [],
        fade: [],
        return: []
      })
      div.remove()
    })
  }
  return div
}

let addLocalMeasureDropdown = function(divId) {
  d3.select(`#${divId}`)
    .append('select')
    .attr('id', 'localMeasureForm')
    .attr('name', 'localMeasure')
    .style('border-radius', '10px')
    .selectAll('option')
    .data(['degree', 'volatility', 'activation', 'redundancy'])
    .enter()
    .append('option')
    .text(d => d)
  $(`#localMeasureForm`).change(function() {
      $(`#localMeasureForm option:selected`).each(function() {
        let content = $(this).text()
        window.localMeasure = content
        networkcube.sendMessage('localMeasure', content)
      })
    })
    .change();
}
let addDatasetOption = function() {
  let container = d3.select('#dataset-selection')
  container.selectAll('a')
    .data(['Embryo', 'Diplomatic Exchange', 'Highschool', 'Marie-Colombu', 'Rolla-Cristofoli', 'Scientists', 'Twitter'])
    .enter()
    .append('a')
    .classed('dropdown-item', true)
    .attr('href', d => `${window.location.origin}${window.location.pathname}?session=demo&datasetName=${d}`)
    .style('padding', '0 1.5rem')
    .text(d => d)
  container.append('div').classed('dropdown-divider', true).style('padding', 0).style('margin', 0)
  container.append('a').classed('dropdown-item disabled', true).text('Dataset Selection').style('padding', '0 1.5rem').style('font-weight','bold')
}
let add_config_mode = function() {
  d3.select('#measureFrame').selectAll('.kdeLine').style('display', 'none')
  $('#modeSwitch').change(function() {
    if (this.checked) {
      // KDE MODE
      d3.select('#measureFrame').selectAll('.kdeLine').style('display', '')
      d3.selectAll('.bars').style('display', 'none')
      d3.selectAll('.y-axis').style('display', 'none')
    } else {
      d3.select('#measureFrame').selectAll('.kdeLine').style('display', 'none')
      d3.selectAll('.bars').style('display', '')
      d3.selectAll('.y-axis').style('display', '')
    }
  })
}
let add_config_pack = function () {
  $('#packSwitch').change(function() {
    if (this.checked) {
      if (!window.playerMode) {
        alert('Please specify an interval.')
        this.checked = false
        return
      }
      // Pack Things up
      let level = window.focusGranularity.level
      Measure.FRAME_INFO.forEach(frame => {
        frame.rectPack(level)
      })
    } else {
      Measure.FRAME_INFO.forEach(frame => frame.rectNormal())
    }
  })
  if (!window.playerMode) return
}

let add_config_measure = function() {
  let frames = Measure.FRAME_INFO
  for (let f of frames) {
    let div = addDivToggle('config-measure', `toggle_${f.dataLabel}`, `${f.title}`, `#frame_${f.dataLabel}`)
  }
  $('#config-measure').sortable({
    update: function(e, ui) {
      let sortedIds = $('#config-measure').sortable("toArray", {attribute: "id"}).map(name => name.substring(12))
      for(let i = 1; i< sortedIds.length; i++) {
        let dataLabel = sortedIds[i]
        let prev = sortedIds[i-1]
        $(`#frame_${dataLabel}`).insertAfter($(`#frame_${prev}`))
      }
    }
    })
}

let handleIntervalSpan = function(m) {
  let data = m.body
  addDivToggle('config-bar', `toggle_level_${data.level}`, data.timeLabel, `.level_${data.level}`, true)
}

let clearConfigs = function() {
  d3.select('#config-view').html('')
  d3.select('#config-style').html('')
  d3.select('#config-localMeasure').html('')
  d3.select('#config-measure').html('')
  d3.select('#config-bar').html('')
}
let drawConfigs = function() {
  clearConfigs()
  let dg = networkcube.getDynamicGraph()
  networkcube.addEventListener('searchResult', handleSearchResult)
  $('#searchBar').on('keypress', function(e) {
    if (e.which == 13) {
      let query = this.value
      networkcube.search(query, 'node')
    }
  })
  networkcube.addEventListener('intervalSpan', handleIntervalSpan)
  addDatasetOption()
  // scatter config
  // addScatterConfig(networkcube.GRANULARITY.slice(dg.getMinGranularity(), dg.getMaxGranularity() + 1), Scatter.localMeasureList)
  // d3.select('#launchScatter')
  //   .on('click', d => Scatter.updateScatter())
  // network style
  d3.select('#config-style').append('p').classed('m-0', true).classed('config-title', true).text('Styling')
  addStyleConfig('config-style', 'Node Size', changeNodeSize)
  addStyleConfig('config-style', 'Link Width', changeLinkWidth, 0, 5)
  addStyleConfig('config-style', 'Link Opacity', changeLinkOpacity, 0, 1, 0.5)
  addStyleConfig('config-style', 'Edge Gap', changeEdgeGap, 0, 5, 2)
  addStyleConfig('config-style', 'Edge Background', changeEdgeBackground, 0, 1, 0.2)
  addStyleConfig('config-style', 'Block Height', changeHeight, 0.5, 2.5, 1, 0.1)
  addBandwidthConfig(dg.timeDelta)
  // addDivToggle('config-view', 'boxframe', 'Local Distribution', '#boxFrame')
  //addDivToggle('config-view', 'timelineframe', 'Multi-layer Line', '#timelineFrame')
  // Add-ons
  addDivToggle('config-view', 'strokeTimeline', 'Vertical line', '.strokeTimeline')
  addDivToggle('config-view', 'brush-result', 'Period Result', '.brush-result')
  addDivToggle('config-view', 'screenshot', 'Snapshots', '#screenshotFrame')

  addLocalMeasureDropdown('config-localMeasure')
  add_config_mode()
  add_config_measure()
  add_config_pack()
  //  addButton('config-view', resetView)
  window.localMeasure = 'degree'

}

export {
  drawConfigs
}
