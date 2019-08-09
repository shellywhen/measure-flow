import * as NodeLink from './nodelinkView.js'
import * as Scatter from './scatterView.js'
let addStyleConfig = function (divId, title, callback, min=0, max=3, value=1) {
  let div = d3.select(`#${divId}`)
    .append('div')
    .classed('slidecontainer', true)
  div.append('p')
    .style('margin-bottom', '-2vh')
   .text(title)

  div.append('input')
    .attr('type', 'range')
    .attr('step', 0.01)
    .attr('min', min)
    .attr('max', max)
    .attr('value', value)
    .classed('slider', true)
    .attr('id', divId)
    .on('input', function() {
      callback(this.value)
    })
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
      let frame = d3.select(`#${linkDiv}`)
      console.log(this, this.checked)
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
let drawConfigs = function () {
  let dg = window.dgraph
  networkcube.addEventListener('searchResult', handleSearchResult)
  $('#searchBar').on('keypress',function(e) {
    if(e.which == 13) {
       let query = this.value
       networkcube.search(query, 'node')
    }
})
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

  addDivToggle('config-view', 'boxframe', 'Local Distribution', 'boxFrame')
  addDivToggle('config-view', 'timelineframe', 'Multi-layer Line', 'timelineFrame')

  addLocalMeasureDropdown('config-localMeasure')
  window.localMeasure = 'degree'

}

export {drawConfigs}
