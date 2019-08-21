/*
Author: Liwenhan Xie
Email: xieliwenhan@gmail.com
Created: Jul 18, 2019
Version: 1
Description: load data to the page
*/
//=================
//Data Loading
//=============
//define link schema
import * as TimeSlider from './timeSlider.js'
import * as NodeLink from './nodelinkView.js'
// import * as TimeLine from './timelineView.js'
import * as Scatter from './scatterView.js'
import * as Config from './configureView.js'
import * as Bookmark from './bookmarkBrowser.js'
import * as Stat from './statView.js'
// import * as Box from './boxView.js'
import * as Kde from  './kdeView.js'
import * as Heatmap from './heatmapView.js'
import * as Measure from './measureView.js'
import * as DataHandler from './dataHandler.js'
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
const configMap = {
  'scientists': [linkSchema1, 'DD/MM/YYYY'],
  'DiplomaticExchange': [linkSchema2 ,'YYYY'],
  'marieboucher': [linkSchema3, 'DD/MM/YYYY'],
  'marie-colombu': [linkSchema4, 'DD/MM/YYYY'],
  'RollaCristofoli': [linkSchema5, 'DDMMYY'],
  'Marguerite': [linkSchema6, 'DD-MM-YYYY']
}
let dataFileName = networkcube.getUrlVars()['datasetName'].replace(/___/g, ' ')
let config = configMap[dataFileName]
// 'DiplomaticExchange.csv' //  'DD/MM/YYYY'
let url = `${domain}${dataFolder}/${dataFileName}.csv`

console.log('find data in ', url)
// load data file with the above link schema
let dataset = networkcube.loadLinkTable(url, afterLoadedData, config[0], ',', config[1])

// create a session for this data set.
function afterLoadedData(dataset) {
    dataset.name = dataFileName
    // import data into browser's localstorage.
    networkcube.importData(session, dataset)
    window.dgraph = networkcube.getDynamicGraph(dataset.name, session)
    DataHandler.addGlobalProperty(window.dgraph)

    // TimeLine.drawTimeLine()
    Measure.drawMeasureList('measureFrame')
    TimeSlider.drawTimeSlider(Measure.WIDTH_LEFT, Measure.WIDTH_MIDDLE)
    //Box.drawBox()
    // Kde.drawKde('timelineFrame')

    Heatmap.drawHeatmap('heatmapFrame')
    NodeLink.drawNodeLink()
    //
    Stat.drawStatView('radarDiv')
    Config.drawConfigs()
    Bookmark.drawBookmark('selection-config')
    console.log('check', window.dgraph === networkcube.getDynamicGraph())

}
