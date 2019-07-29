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
let linkSchema = {  source: 0,
                    target: 3,
                    weight: 6,
                    time: 5,
                    linkType: 2
                  }
let session = 'demo'
const domain = window.location.href
const dataFolder = 'data'
let dataFileName = 'scientists.csv'
let url = `${domain}${dataFolder}/${dataFileName}`
console.log('find data in ', url)
// load data file with the above link schema
let dataset = networkcube.loadLinkTable(url, afterLoadedData, linkSchema, ',', 'DD/MM/YYYY')
// create a session for this data set.
function afterLoadedData(dataset) {
    // import data into browser's localstorage.
    networkcube.importData(session, dataset)
    window.dgraph = networkcube.getDynamicGraph(dataset.name, session)
    window.dgraph.nodeSelection = new Set([0, 1])
    TimeSlider.drawTimeSlider()
    TimeLine.drawTimeLine()
    Config.drawConfigs()
    //NodeLink.drawNodeLink()
}
