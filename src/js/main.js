/*
Author: Liwenhan Xie
Email: xieliwenhan@gmail.com
Created: Jul 18, 2019
Last Modify: Nov 12, 2019
Version: 3
Description: load data to the page
*/
//=================
// Everything starts here.
//=============
//define link schema
import * as TimeSlider from './timeSlider.js'
import * as NodeLink from './nodelinkView.js'
import * as TimeLine from './timelineView.js'
// import * as Scatter from './scatterView.js'
import * as Config from './configureView.js'
import * as Bookmark from './bookmarkBrowser.js'
import * as Constant from './constant.js'
// import * as Stat from './statView.js'
import * as Box from './boxView.js'
// import * as Kde from  './kdeView.js'
import * as Heatmap from './heatmapView.js'
import * as Measure from './measureView.js'
import * as DataHandler from './dataHandler.js'
import * as Interval from './intervalConfig.js'

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}
let dataFileName = networkcube.getUrlVars()['datasetName'].replace(/___/g, ' ')
let config = [Constant.SCHEMA[dataFileName], Constant.TIME_FORMAT[dataFileName]]
let url = `${domain}${dataFolder}/${dataFileName}.csv`
let name = dataFileName
if (dataFileName.length >20) name = dataFileName.substring(0, 21) + '..'
else {
  let space = '&nbsp;'.repeat(Math.trunc(20-dataFileName.length))
  name = space + name + space
}
d3.select('#dropdownMenuButton').html(name)
// load data file with the above link schema
let dataset = networkcube.loadLinkTable(url, afterLoadedData, config[0], ',', config[1])
// create a session for this data set.
function afterLoadedData(dataset) {
  dataset.name = dataFileName
  // import data into browser's localstorage.
  networkcube.importData(session, dataset)
  window.dgraph = networkcube.getDynamicGraph(dataset.name, session)
  afterData()
}

function handleSubgraph(m) {
  let dg = window.dgraph
  if (m.body.remove) {
    let idx = 0
    for (let i in dg.selection) {
      if (dg.selection[i].id === m.body.deleteId) {
        console.log('Delete Subgraph id', dg.selection[i].id, 'in', i)
        idx = i
        break
      }
    }
    dg.selection.splice(idx, 1)
    Measure.FRAME_INFO.forEach(f => {
      f.yMax.splice(idx, 1)
      f.data.splice(idx, 1)
      f.fftMilisecond.splice(idx, 1)
      f.fftData.splice(idx, 1)
    })
    if (dg.selection.length != 0) {
      Measure.changeSVGHEIGHT()
      FRAME_INFO.forEach(frame => {
        frame.updateCanvas()
        frame.drawMeasureOvertime()
        frame.init()
      })
      $('#modeSwitch').prop('checked', false)
      d3.select('#measureFrame').selectAll('.kdeLine').style('display', 'none')
    } else {
      Measure.setCanvasParameters('measureFrame', dgraph)
      Measure.measureFrameInit(dgraph)
    }
    return
  }
  let id = dg.selectionIdCount
  dg.selectionIdCount++
  let selection = m.body.selection
  let subgraph = DataHandler.getSubgraphDgraph(dg, selection)
  let dotList = TimeLine.getData(subgraph)
  let linkTypeDotList = TimeLine.getLinkStat(subgraph, dg.timeArrays.intervals, dg.linkTypeArrays.name)
  Object.keys(linkTypeDotList).forEach(function(name) {
    dotList[`linkType_${name}`] = linkTypeDotList[name]
  })
  let nodeTypeDotList = TimeLine.getNodeStat(subgraph, dg.timeArrays.intervals, dg.nodeTypeArrays.name)
  Object.keys(nodeTypeDotList).forEach(function(name) {
    dotList[`nodeType_${name}`] = nodeTypeDotList[name]
  })
  let selectionList = Array.from(selection)
  let newSelection = {
    'id': id,
    'color': dg.colorScheme[id],
    'idList': selectionList.map(v => v.index),
    'active': true,
    'dotList': dotList,
    'dgraph': subgraph
  }
  dg.selection.push(newSelection)
  if (m.body.flag) {
    Measure.subgraphUpdateMeasure(dg, 1)
    $('#modeSwitch').prop('checked', false)
    d3.select('#measureFrame').selectAll('.kdeLine').style('display', 'none')
  }
}

window.afterData = function() {
  let dgraph = window.dgraph
  Bookmark.drawBookmark('selection-config')
  loadVisualizationList()
  DataHandler.addGlobalProperty(dgraph)
  //  DataHandler.getSubgraphDgraph(window.dgraph, new Set([0,1,2,3,4,5,6,7,8,9]))
  // TimeLine.drawTimeLine()
  //  TimeSlider.drawTimeSlider(Measure.WIDTH_LEFT, Measure.WIDTH_MIDDLE)
  Box.drawBox()
  let data = Heatmap.drawHeatmap('heatmapFrame')
  NodeLink.drawNodeLink()
  //  Measure.drawMeasureList('measureFrame')
  Measure.measureFrameInit(dgraph, data)
  //
  //  Stat.drawStatView('radarDiv')
  Config.drawConfigs()
  Interval.drawIntervalConfig('config-interval', dgraph)
  d3.select('#frame_linkPairNumber').select('.measureTitle').dispatch('click')
  networkcube.addEventListener('subgraph', handleSubgraph)
}


window.resetInterval = function() {
  Box.drawBox()
  let data = Heatmap.drawHeatmap('heatmapFrame')
  Measure.measureFrameInit(window.dgraph, data, 'measureFrame')
  Config.drawConfigs()
  Interval.drawIntervalConfig('config-interval', dgraph)
  Bookmark.drawBookmark('selection-config')
  d3.select('#frame_linkPairNumber').select('.measureTitle').dispatch('click')
}

function loadVisualizationList() {
  let dom = `${window.location.origin}${window.location.pathname}`
  let query = `${window.location.search}`
  let visualizations = [
    ['Node Link', 'nodelink'],
    ['Adjacency Matrix', 'matrix'],
    ['Time Arcs', 'dynamicego'],
    ['Map', 'map'],
    ['Tiled View', 'tileview']
  ];
  $('#visualizationList').html('')
  visualizations.forEach(function(v) {
    $('#visualizationList')
      .append(`<div class="col p-0 m-0" style="text-align: center;" >
                        <a href=${dom}/web/sites/${v[1]}.html${query} target="_blank">
                        <div class="view overlay hoverable zoom m-0 p-2">
                          <img style="width:100%;" src="asset/figures/${v[1]}.png" class="visicon img-fluid " alt="zoom"/>
                          <div class="rgba-white-strong mask flex-center waves-effect waves-light">
                            <p class="black-text font-weight-bold">${v[0]}</p>
                          </div>
                       </div>
                        </a>
                    </div>`);
  });
}
