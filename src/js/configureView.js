import * as NodeLink from './nodelinkView.js'
import * as Scatter from './scatterView.js'
import * as Measure from './measureView.js'
let addStyleConfig = function (divId, title, callback, min=0, max=3, value=1, step=0.01) {
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

let changeNodeSize = function (x) {
  d3.selectAll('.nodes')
    .attr('r', d => x * NodeLink.getNodeRadius(d))
}

let changeLinkWidth = function (x) {
  d3.selectAll('.links')
    .style('stroke-width', d => x * NodeLink.getLineStroke(d))
}

let changeLinkOpacity = function (x) {
  d3.selectAll('.links')
    .style('stroke-opacity', x)
}

let changeEdgeGap = function (x)  {
  networkcube.sendMessage('gap', x)
}

let changeEdgeBackground = function (x) {
  d3.selectAll('.links')
    .style('fill-opacity', x)
}

let changeBandWidth = function (x) {
  let timeDelta = networkcube.getDynamicGraph().timeDelta
  let day = x * timeDelta / (1000 * 24 * 60 * 60)
  let minute = x * timeDelta / (1000 * 60 * 60)
  d3.select('#bandwidthHint').text(function () {
    if (day > 1) return day.toFixed(0)
    else return minute.toFixed(1)
  })
  d3.select('#bandwidthUnit').text(function () {
    if (day > 1) return ' days'
    else return ' minutes'
  })
  networkcube.sendMessage('bandwidth', x)
}

let handleSearchResult = function (m) {
  console.log('Get Search Result', m)
}
let addScatterConfig = function (granList, localMeasureList) {
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
let addBandwidthConfig = function (timeDelta) {
  let div = addStyleConfig('config-style', 'Bandwidth', changeBandWidth, 0, 3, 0.5, 0.0005)
  let bandwidth = Measure.BANDWIDTH
  let day = timeDelta * bandwidth / (1000 * 60 * 60 * 24)
  let minute = timeDelta * bandwidth / (1000 * 60 * 60)
  let text = div.append('p')
     .text('≈ ')
  text.append('span')
     .attr('id', 'bandwidthHint')
     .text(function () {
       if(day < 1) return minute.toFixed(1)
       else return day.toFixed(0)
     })
  text.append('span')
    .attr('id', 'bandwidthUnit')
    .text(function () {
      if(day < 1) return ' minutes'
      else return ' days'
  })
}
let addDivToggle = function (divId = 'config-view', checkboxId, name, linkDiv) {
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
  div.append('label')
    .classed('form-check-label', true)
    .attr('for', checkboxId)
    .text(name)
    $(`#${id}`).prop('checked', true);
    $(`#${id}`).change(function() {
      let frame = d3.selectAll(`${linkDiv}`)
        if (this.checked) {
          frame.style('display', '')
        } else {
      frame.style('display', 'none')
        }
    })
}
let addLocalMeasureDropdown = function (divId) {
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
  $(`#localMeasureForm`).change(function () {
      $(`#localMeasureForm option:selected`).each(function() {
        let content = $(this).text()
        window.localMeasure = content
        networkcube.sendMessage('localMeasure', content)
      })
    })
    .change();
}
let addDatasetOption = function () {
  d3.select('#dataset-selection')
    .selectAll('a')
    .data(['Marguerite', 'marieboucher', 'marie-colombu', 'highschool', 'DiplomaticExchange'])
    .enter()
    .append('a')
    .classed('dropdown-item', true)
    .attr('href', d => `${window.location.origin}${window.location.pathname}?session=demo&datasetName=${d}`)
    .text(d => d)
}
let drawConfigs = function () {
  d3.select('#config-view').html('')
  d3.select('#config-style').html('')
  d3.select('#config-localMeasure').html('')
  let dg = networkcube.getDynamicGraph()
  networkcube.addEventListener('searchResult', handleSearchResult)
  $('#searchBar').on('keypress',function(e) {
    if(e.which == 13) {
       let query = this.value
       networkcube.search(query, 'node')
    }
})
  addDatasetOption()
  // scatter config
  addScatterConfig(networkcube.GRANULARITY.slice(dg.getMinGranularity(), dg.getMaxGranularity() + 1), Scatter.localMeasureList)
  d3.select('#launchScatter')
    .on('click', d => Scatter.updateScatter())
  // network style
  addStyleConfig('config-style', 'Node Size', changeNodeSize)
  addStyleConfig('config-style', 'Link Width', changeLinkWidth, 0, 5)
  addStyleConfig('config-style', 'Link Opacity', changeLinkOpacity, 0, 1, 0.5)
  addStyleConfig('config-style', 'Edge Gap', changeEdgeGap, 0, 5, 2)
  addStyleConfig('config-style', 'Edge Background', changeEdgeBackground, 0, 1, 0.2)
  addBandwidthConfig(dg.timeDelta)
  addDivToggle('config-view', 'boxframe', 'Local Distribution', '#boxFrame')
  //addDivToggle('config-view', 'timelineframe', 'Multi-layer Line', '#timelineFrame')
  addDivToggle('config-view', 'strokeTimeline', 'Vertical Timeline', '.strokeTimeline')
  addDivToggle('config-view', 'brush-result', 'Period Result', '.brush-result')
  addDivToggle('config-view', 'showLine', 'Density', '.kdeLine')
  addDivToggle('config-view', 'showLinkType', 'Link Type Stat', '#linkTypeFrame')
  addDivToggle('config-view', 'showNodeType', 'Node Type Stat', '#nodeTypeFrame')
  addLocalMeasureDropdown('config-localMeasure')
//  addButton('config-view', resetView)
  window.localMeasure = 'degree'
}

export {drawConfigs}
