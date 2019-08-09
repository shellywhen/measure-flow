import * as Nodelink from './nodelinkView.js'

export let handleSelect = function (nodeId) {
  if (window.dgraph.nodeSelection.has(nodeId)) deleteNode(nodeId)
  else addNode(nodeId)
}

export let getLocalMeasure = function (node, flag=false) {
  let nodes = []
  let neighbors = window.dgraph.nodeArrays.neighbors[node.index].serie
  let startId = window.activeTime.startId
  let endId = window.activeTime.endId
  if(flag === true) {
    startId = 0
    endId = window.dgraph.timeArrays.momentTime.length - 1
  }
  switch (window.localMeasure) {
    case 'degree':
      for (let t = startId; t <= endId; t++)
        if(t in neighbors)
          nodes.push(...neighbors[t])
      return new Set(nodes).size
  }
}

let deleteNode = function (nodeId) {
  let flag = window.dgraph.nodeSelection.delete(nodeId)
  updateSelectionList()
  console.log(`deleteNode ${nodeId}: ${flag}`)
  console.log(window.dgraph.nodeSelection)
}

let addNode = function (nodeId) {
  window.dgraph.nodeSelection.add(nodeId)
  updateSelectionList()
}

let updateSelectionList = function () {
  let dg = window.dgraph
  let idList = Array.from(dg.nodeSelection)
  d3.select('#selectedNodeList')
    .selectAll('.nodeList')
    .remove()
  d3.select('#selectedNodeList')
    .selectAll('.nodeList')
    .data(idList)
    .enter()
    .append('span')
    .style('width', 'fit-content')
    .style('border-radius', '5px')
    .style('border', '0.5px orange solid')
    .style('font-size', '0.8rem')
    .classed('chip', true)
    .classed('nodeList', true)
    .classed('mr-1', true)
    .text( (d,i) => {
      return `${dg.nodeArrays.label[d]}`
    })
    .on('mouseover', d => {
      d3.select(`#node_${d}`)
        .style('fill', 'orange')
    })
    .on('mouseout', d => {
      d3.select(`#node_${d}`)
        .style('fill', Nodelink.getNodeColor(d))
    })
    .append('i')
    .classed('close', true)
    .classed('fas', true)
    .classed('fa-times', true)
    .style('font-size', 'small')
    .style('float', 'none')
    .on('click', d => deleteNode(d))

}

export let getLocalDistribution = function (rawdata) {

}
