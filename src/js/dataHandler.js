import * as Nodelink from './nodelinkView.js'
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*365*10+2, 1000*60*60*24*36525, 1000*60*60*24*30*12*1000]

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

export let getRoundStart = function (start, end) {
  let round = new Date(start)
  round.setHours(0)
  round.setMinutes(0)
  round.setSeconds(0)
  round.setMilliseconds(0)
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
       return round.getTime()
    }
    round.setDate(1)
    return round.getTime()
  }
  round.setMonth(0)
  round.setDate(1)
  return round.getTime()
}

export let getRoundEnd = function (start, end) {
  let round = new Date(end)
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
     if (end.getDate() - start.getDate() < 10) {
       return round.getTime()
     }
      round.setMonth(end.getMonth() + 1)
        round.setDate(1)
    }
    return round.getTime()
  }
  round.setMonth(0)
  round.setDate(1)
  round.setFullYear(end.getFullYear() + 1)
  round.setHours(0)
  round.setMinutes(0)
  round.setSeconds(0)
  round.setMilliseconds(0)
  return round.getTime()
}

let getBins = function (timeArray, minGran, maxGran) {
  let results = []
  for (let granId = minGran; granId <= maxGran; granId ++) {
    let result = {'granularity': granId}
    let idx = 0
    let box = []
    let roundedStart = window.dgraph.roundedStart
    let roundedEnd = window.dgraph.roundedEnd
    for (let timeStamp = roundedStart; timeStamp <= roundedEnd; timeStamp += timeList[granId]) {
      let v = {}
      v.interval = [-1, -1]
      v.x0 = new Date(timeStamp)
      v.x1 = new Date(timeStamp + timeList[granId])
      if(v.x1 > timeArray[timeArray.length - 1]._i) v.x1 = timeArray[timeArray.length - 1]._d
      if (timeArray[idx]._i >= v.x0 && timeArray[idx]._i <= v.x1) {
        v.interval[0] = idx
        while (timeArray[idx]._i >= v.x0 && timeArray[idx]._i <= v.x1) {
          v.interval[1] = idx
          if(idx < timeArray.length - 1) idx ++
          else break
        }
      }
      if(v.interval[0]!== -1) box.push(v)
    }
    result.period = box
    results.push(result)
  }
  return results
}

export let addGlobalProperty = function (dgraph) {
  let timeArray = dgraph.timeArrays.momentTime
  let size = timeArray.length
  let start = timeArray[0]._d
  let end = timeArray[size - 1]._d
  dgraph.roundedStart = getRoundStart(start, end)
  dgraph.roundedEnd = getRoundEnd(start, end)

  dgraph.nodeSelection = new Set()

  let intervals = getBins(dgraph.timeArrays.momentTime, dgraph.getMinGranularity(), dgraph.getMaxGranularity())
  dgraph.timeArrays.intervals = intervals
}

export let getTimeStamp = function (dgraph = window.dgraph) {
  let timeArray = dgraph.timeArrays.momentTime.map(v => v._i)
  let gran_min = timeList[dgraph.gran_min + 2]
  let timeStamp = timeArray.map((v, i) => {
    if (i === 0) return 0
    return (v - timeArray[i-1])
  })
  let timeDelta = d3.mean(timeStamp)
  dgraph.timeDelta = timeDelta
  let timeValue = timeArray.map((v, i) => {
    if (i === 0) return 0
    return (v - timeArray[0]) / timeDelta
  })
  return timeValue
}

export let getSubgraphDgraph = function (dgraph, nodeSet) {
  if (nodeSet.size === dgraph.nodeArrays.links.length) return dgraph
  let dg = {
    timeArrays: {unixTime: dgraph.timeArrays.unixTime, intervals: dgraph.timeArrays.intervals, momentTime: dgraph.timeArrays.momentTime, links: dgraph.timeArrays.links.map(v => [])},
    linkArrays: {nodePair: dgraph.linkArrays.nodePair, target: dgraph.linkArrays.target, source: dgraph.linkArrays.source},
    nodeArrays: {neighbors: dgraph.nodeArrays.neighbors.map(function(v) {
      return {
        serie: {}
      }
    })},
    gran_min: dgraph.gran_min,
    gran_max: dgraph.gran_max,
    timeDelta: dgraph.timeDelta,
    roundedEnd: dgraph.roundedEnd,
    roundedStart: dgraph.roundedStart
  }
  dgraph.timeArrays.links.forEach((period, t) => {
    period.forEach(lid => {
      let target = dg.linkArrays.target[lid]
      let source = dg.linkArrays.source[lid]
      if (nodeSet.has(target) && nodeSet.has(source)) {
        dg.timeArrays.links[t].push(lid)
        if (t in dg.nodeArrays.neighbors[source].serie) {
          dg.nodeArrays.neighbors[source].serie[t].add(target)
        }
        else dg.nodeArrays.neighbors[source].serie[t] = new Set([target])
        if (t in dg.nodeArrays.neighbors[target].serie) {
          dg.nodeArrays.neighbors[target].serie[t].add(source)
        }
        else dg.nodeArrays.neighbors[target].serie[t] = new Set([source])
      }
    })
  })
  for (let nodes of dg.nodeArrays.neighbors) {
     let neighbors = nodes.serie
     for (let t in neighbors) {
       neighbors[t] = Array.from(neighbors[t])
     }
  }
return dg
}
