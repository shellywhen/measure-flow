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

let changeNodeSize = function(x) {
  d3.selectAll('.nodes')
    .attr('r', d => x * NodeLink.getNodeRadius(d))
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
  let day = x * timeDelta / (1000 * 24 * 60 * 60)
  let minute = x * timeDelta / (1000 * 60 * 60)
  d3.select('#bandwidthHint').text(function() {
    if (day > 1) return day.toFixed(0)
    else return minute.toFixed(1)
  })
  d3.select('#bandwidthUnit').text(function() {
    if (day > 1) return ' days'
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
  let div = addStyleConfig('config-style', 'Bandwidth', changeBandWidth, 0, 3, 0.5, 0.0005)
  let bandwidth = Measure.BANDWIDTH
  let day = timeDelta * bandwidth / (1000 * 60 * 60 * 24)
  let minute = timeDelta * bandwidth / (1000 * 60 * 60)
  let text = div.append('p')
    .classed('m-0', true)
    .text('≈ ')
  text.append('span')
    .attr('id', 'bandwidthHint')
    .text(function() {
      if (day < 1) return minute.toFixed(1)
      else return day.toFixed(0)
    })
  text.append('span')
    .attr('id', 'bandwidthUnit')
    .text(function() {
      if (day < 1) return ' minutes'
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
  d3.select('#dataset-selection')
    .selectAll('a')
    .data(['Marguerite', 'marieboucher', 'marie-colombu', 'highschool', 'DiplomaticExchange'])
    .enter()
    .append('a')
    .classed('dropdown-item', true)
    .attr('href', d => `${window.location.origin}${window.location.pathname}?session=demo&datasetName=${d}`)
    .text(d => d)
}
let add_config_mode = function() {
  d3.select('#config-mode')
    .html(`<div class="row ml-1 mr-1">
  <div class="col-3 p-0">Bar</div>
  <div class="col-3 p-0">
    <div class="custom-control custom-switch">
      <input type="checkbox" class="custom-control-input" id="modeSwitch">
      <label class="custom-control-label" for="modeSwitch"></label>
    </div>
  </div>
  <div class="col p-0">Density</div>
</div>`)
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

let add_config_measure = function() {
  let frames = Measure.FRAME_INFO
  for (let f of frames) {
    addDivToggle('config-measure', `toggle_${f.dataLabel}`, `${f.title}`, `#frame_${f.dataLabel}`)
  }
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
  d3.select('#config-mode').html('')
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
  addStyleConfig('config-style', 'Node Size', changeNodeSize)
  addStyleConfig('config-style', 'Link Width', changeLinkWidth, 0, 5)
  addStyleConfig('config-style', 'Link Opacity', changeLinkOpacity, 0, 1, 0.5)
  addStyleConfig('config-style', 'Edge Gap', changeEdgeGap, 0, 5, 2)
  addStyleConfig('config-style', 'Edge Background', changeEdgeBackground, 0, 1, 0.2)
  addBandwidthConfig(dg.timeDelta)
  // addDivToggle('config-view', 'boxframe', 'Local Distribution', '#boxFrame')
  //addDivToggle('config-view', 'timelineframe', 'Multi-layer Line', '#timelineFrame')
  addDivToggle('config-view', 'strokeTimeline', 'Vertical line', '.strokeTimeline')
  addDivToggle('config-view', 'brush-result', 'Period Result', '.brush-result')
  addLocalMeasureDropdown('config-localMeasure')
  add_config_mode()
  add_config_measure()
  //  addButton('config-view', resetView)
  window.localMeasure = 'degree'

}

export {
  drawConfigs
}
