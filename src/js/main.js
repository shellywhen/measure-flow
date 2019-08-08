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
import * as TimeLine from './timelineView.js'
import * as Scatter from './scatterView.js'
import * as Config from './configureView.js'
import * as Bookmark from './bookmarkBrowser.js'
import * as Stat from './statView.js'
import * as Box from './boxView.js'
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
const configMap = {
  'scientists': [linkSchema1, 'DD/MM/YYYY'],
  'DiplomaticExchange': [linkSchema2 ,'YYYY'],
  'marieboucher': [linkSchema3, 'DD/MM/YYYY']
}
let dataFileName = networkcube.getUrlVars()['datasetName'].replace(/___/g, ' ')
let config = configMap[dataFileName]
// 'DiplomaticExchange.csv' //  'DD/MM/YYYY'
let url = `http://${domain}/${dataFolder}/${dataFileName}.csv`

console.log('find data in ', url)
// load data file with the above link schema
let dataset = networkcube.loadLinkTable(url, afterLoadedData, config[0], ',', config[1])

// create a session for this data set.
function afterLoadedData(dataset) {
    dataset.name = dataFileName
    // import data into browser's localstorage.
    networkcube.importData(session, dataset)
    window.dgraph = networkcube.getDynamicGraph(dataset.name, session)
    window.dgraph.nodeSelection = new Set()
    TimeLine.drawTimeLine()
    Box.drawBox()

    TimeSlider.drawTimeSlider()
    NodeLink.drawNodeLink()
    Stat.drawStatView('radarDiv')
    Config.drawConfigs()
    Bookmark.drawBookmark('selection-config')


}
