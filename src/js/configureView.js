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

let drawConfigs = function () {
  let dg = window.dgraph
  // search bar
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
}

export {drawConfigs}
