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
// import * as Stat from './statView.js'
// import * as Box from './boxView.js'
// import * as Kde from  './kdeView.js'
// import * as Heatmap from './heatmapView.js'
import * as Measure from './measureView.js'
import * as DataHandler from './dataHandler.js'
import * as Interval from './intervalConfig.js'
async function loadFFT(){
  let res = await load('fft-js').then(fft => {
      window.FFT = fft
    })
  return res
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

let linkSchema1 = {  source: 0,
                    target: 3,
                    weight: 6,
                    time: 5,
                    linkType: 2
                  }
let linkSchema2 = {
  source: 7,
  target: 8,
  weight: 5,
  time: 2,
  linkType: 3
}
let linkSchema3 = {
  source: 0,
  target: 3,
  time: 9,
  linkType: 2
}
let linkSchema4= {
  source: 1,
  target: 6,
  time: 14,
  linkType: 5
}
let linkSchema6 = {
  time: 2,
  linkType: 10,
  source: 6,
  target: 8
}
let linkSchema5 = {
  time: 14,
  source: 10,
  target: 11,
  linkType: 21
}
let linkSchema7 = {
  source: 1,
  target: 2,
  time: 5
}
const configMap = {
  'scientists': [linkSchema1, 'DD/MM/YYYY'],
  'DiplomaticExchange': [linkSchema2 ,'YYYY'],
  'marieboucher': [linkSchema3, 'DD/MM/YYYY'],
  'marie-colombu': [linkSchema4, 'DD/MM/YYYY'],
  'RollaCristofoli': [linkSchema5, 'DDMMYY'],
  'Marguerite': [linkSchema6, 'DD-MM-YYYY'],
  'highschool': [linkSchema7, 'MM/DD/YYYY HH:mm:ss']
}
let dataFileName = networkcube.getUrlVars()['datasetName'].replace(/___/g, ' ')
let config = configMap[dataFileName]
// 'DiplomaticExchange.csv' //  'DD/MM/YYYY'
let url = `${domain}${dataFolder}/${dataFileName}.csv`
// load data file with the above link schema
let dataset = networkcube.loadLinkTable(url, afterLoadedData, config[0], ',', config[1])
// create a session for this data set.
async function afterLoadedData(dataset) {
   await loadFFT()
    dataset.name = dataFileName
    // import data into browser's localstorage.
    networkcube.importData(session, dataset)
    window.dgraph = networkcube.getDynamicGraph(dataset.name, session)
    afterData()
}

window.afterData = function () {
  let dgraph = window.dgraph
  Bookmark.drawBookmark('selection-config')
  loadVisualizationList()
   DataHandler.addGlobalProperty(dgraph)
//  DataHandler.getSubgraphDgraph(window.dgraph, new Set([0,1,2,3,4,5,6,7,8,9]))
  // TimeLine.drawTimeLine()
//  TimeSlider.drawTimeSlider(Measure.WIDTH_LEFT, Measure.WIDTH_MIDDLE)
  //Box.drawBox()

//  Heatmap.drawHeatmap('heatmapFrame')
  NodeLink.drawNodeLink()
//  Measure.drawMeasureList('measureFrame')
  Measure.measureFrameInit(dgraph)
  //
//  Stat.drawStatView('radarDiv')
  Config.drawConfigs()
  Interval.drawIntervalConfig('config-interval', dgraph)
  networkcube.addEventListener('subgraph', function (m) {
    let dg = window.dgraph
    let id = dg.selection.length
    let selection = m.body.selection
    let subgraph = DataHandler.getSubgraphDgraph(dg,selection)
    let dotList = TimeLine.getData(subgraph)
    let linkTypeDotList = TimeLine.getLinkStat(subgraph, dg.timeArrays.intervals, dg.linkTypeArrays.name)
    Object.keys(linkTypeDotList).forEach(function(name){
      dotList[`linkType_${name}`] = linkTypeDotList[name]
    })
    let nodeTypeDotList = TimeLine.getNodeStat(subgraph, dg.timeArrays.intervals, dg.nodeTypeArrays.name)
    Object.keys(nodeTypeDotList).forEach(function(name){
      dotList[`nodeType_${name}`] = nodeTypeDotList[name]
    })
    let selectionList = Array.from(selection)
    let newSelection = {
      'id': id,
      'color': dg.colorScheme[id],
      'idList': selectionList.map(v=>v.index),
      'active': true,
      'dotList': dotList,
      'dgraph': subgraph
    }
    dg.selection.push(newSelection)
    if(m.body.flag)  {
      Measure.subgraphUpdateMeasure(dg, 1)
    }
  })
}


window.resetInterval = function () {
  Measure.measureFrameInit(window.dgraph, 'measureFrame')
  console.log('reset Interval')
  Config.drawConfigs()
  Bookmark.drawBookmark('selection-config')
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
    visualizations.forEach(function (v) {
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
