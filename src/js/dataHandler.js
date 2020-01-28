import * as Nodelink from './nodelinkView.js'
const timeList = [1, 1000, 1000*60, 1000*60*60, 1000*60*60*24, 1000*60*60*24*7, 1000*60*60*24*30, 1000*60*60*24*365, 1000*60*60*24*365*10+2, 1000*60*60*24*36525, 1000*60*60*24*30*12*1000]
const timePara = ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years']
const GRANULARITY_name = ['milisecond', 'second', 'minute', 'hour', 'day', 'weekday', 'month', 'year', 'decade', 'century', 'millennium']
const GRANULARITY_name_normal = ['milisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium']
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
  let res = 0
  switch (window.localMeasure) {
    case 'degree':
      for (let t = startId; t <= endId; t++)
        if(t in neighbors)
          nodes.push(...neighbors[t])
      res = new Set(nodes).size
  }
  let result = res || 1
  return result
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

export let getRoundStart = function (start, end) {
  return start
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
  return end
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

export let getSingleBins = function (granId, delta = 1, timeArray = window.dgraph.timeArrays.momentTime, shift=0) {
  let para
  let para2
  if(granId > 7) {
    delta = Math.pow(10, granId - 7)
    para = 'years'
    para2 = 'days'
  }
  else {
    para = timePara[granId]
    para2 = granId > 3? timePara[granId - 3]:'miliseconds'
  }

  let idx = 0
  let counter = 0
  let box = []
  let roundedStart = window.dgraph.roundedStart
  let roundedEnd = window.dgraph.roundedEnd
  let wholePeriod = new Date(moment(0).add(delta, para)._d).getTime()
  let shiftMilisecond = shift > 0 ? (1 - shift)*wholePeriod : shift * wholePeriod
  let shiftedStart = new Date(moment(roundedStart).add(shiftMilisecond, 'miliseconds')._d)

  if(shift != 0) {
    while(timeArray[idx]._i < shiftedStart ) {
      idx ++
    }
    box.push({
      interval: [0, idx],
      index: 1,
      x0: new Date(roundedStart),
      x1: new Date(shiftedStart)
    })
    counter = 1
  }

  let empty = {}
  let flag = false
  let recorded_x0 = new Date(shiftedStart)

  for (let timeStamp = shiftedStart; timeStamp <= roundedEnd;) {
    let v = {}
    v.interval = [-1, -1]  // open section
    v.x0 = new Date(timeStamp)
    v.x1 = moment(v.x0).add(delta, para)._d
    timeStamp = new Date(v.x1) // timeStamp += one interval

    if(v.x0 > timeArray[timeArray.length - 1]._i) break
    if(v.x1 > timeArray[timeArray.length - 1]._i) v.x1 = timeArray[timeArray.length - 1]._d

    if (timeArray[idx]._i >= v.x0 && timeArray[idx]._i <= v.x1) { // there is sth going on in this period

      if (flag) {    // record the empty phase before
        box.push({
          interval: [idx, idx],
          x0: recorded_x0,
          x1: v.x0,
          x2: moment(v.x1).subtract(1, para2)._d,
          index: counter - 1
        })
        flag = false
      }

      v.interval[0] = idx
      while (timeArray[idx]._i >= v.x0 && timeArray[idx]._i <= v.x1) {
        v.interval[1] = idx
        if(idx < timeArray.length - 1) idx ++
        else break
      }
    }
    else {
      if(!flag) {
        flag = true
        recorded_x0 = v.x0
      }
    }
    if(v.interval[0]!== -1) {
      v.interval[1]+=1
      v.index = counter
      v.x2 = moment(v.x1).subtract(1, para2)._d
      box.push(v)
    }
    counter++
  }
  box[box.length - 1].x1 = new Date(roundedEnd)
  return {
    'period': box,
    'granularity': granId,
    'delta': delta,
    'milisecond': moment(0).add(delta, para)._d
  }
}

let getBins = function (timeArray, minGran, maxGran) {
  let results = []
  for (let granId = minGran; granId <= maxGran; granId ++) {
    let res = getSingleBins(granId)
    results.push(res)
  }
  return results
}

export let FourierTransform = function (dots, time, total = 6) {
  let FFT = window.FFT
  let len = time[time.length - 1].index + 1
  let index = Math.ceil(Math.log2(len))
  let newlen = Math.pow(2, index)
  let serie = Array(newlen).fill(0)
  for(let tid in time) {
    serie[time[tid].index] = dots[tid].y
  }
  let phasors = FFT.fft(serie)
  let frequencies = FFT.util.fftFreq(phasors, newlen)
  let magnitudes = FFT.util.fftMag(phasors)
  // .slice(0, 30).filter(v => v[1]>0)
  let res  = frequencies.map((f, ix) => {
    let t = newlen / f
    return {frequency: f, magnitude: magnitudes[ix], index:ix, T: t}
})
res.sort((a,b) => b.magnitude - a.magnitude)
res.shift()
res.forEach(r => {
  r.phase = phasors[r.index]
})
res = res.slice(1, total)
//res.sort((a, b) => a.frequency - b.frequency)
return res
}

export let addGlobalProperty = function (dgraph) {
  let timeArray = dgraph.timeArrays.momentTime
  let size = timeArray.length
  let start = timeArray[0]._d
  let end = timeArray[size - 1]._d
  dgraph.roundedStart = getRoundStart(start, end)
  dgraph.roundedEnd = getRoundEnd(start, end)
  dgraph.nodeSelection = new Set()
  dgraph.colorScheme = [
  '#1f78b4',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
  '#6a3d9a',
  '#ffff99',
  '#b15928',
  '#a6cee3',
  '#b2df8a']
  dgraph.selection = []
  dgraph.timeArrays.FFTintervals = []
  let intervals = getBins(dgraph.timeArrays.momentTime, dgraph.getMinGranularity(), dgraph.getMaxGranularity())
  dgraph.timeArrays.intervals = intervals
  dgraph.timeArrays.defalutIntervals = intervals
  dgraph.nodeArrays.activeNodes = dgraph.nodeArrays.id
}

export let getTimeStamp = function (dgraph = window.dgraph) {
  let timeArray = dgraph.timeArrays.momentTime.map(v => v._i)
  let gran_min = timeList[dgraph.gran_min]
  let timeStamp = timeArray.map((v, i) => {
    if (i === 0) return 0
    return (v - timeArray[i-1])
  })
  timeStamp.shift()
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
    timeArrays: {
      unixTime: dgraph.timeArrays.unixTime,
      intervals: dgraph.timeArrays.intervals,
      momentTime: dgraph.timeArrays.momentTime,
      links: dgraph.timeArrays.links.map(v => [])},
    linkArrays: {
      nodePair: dgraph.linkArrays.nodePair,
      target: dgraph.linkArrays.target,
      source: dgraph.linkArrays.source,
      linkType: dgraph.linkArrays.linkType,
      weights: dgraph.linkArrays.weights
    },
    nodeArrays: {
      activeNodes: Array.from(nodeSet),
      nodeType: dgraph.nodeArrays.nodeType,
      neighbors: dgraph.nodeArrays.neighbors.map(function(v) {
        return {  serie: {} }
    })
  },
    gran_min: dgraph.gran_min,
    gran_max: dgraph.gran_max,
    timeDelta: dgraph.timeDelta,
    roundedEnd: dgraph.roundedEnd,
    roundedStart: dgraph.roundedStart,
    linkTypeArrays: dgraph.linkTypeArrays,
    nodeTypeArrays: dgraph.nodeTypeArrays
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

export let generateDateLabel = function (minGran, maxGran) {
  let data = []
  for (let i = minGran; i <= maxGran; i ++) {
    let item = {}
    item.frequency = timeList[i] / timeList[minGran]
    item.label = `1 ${GRANULARITY_name_normal[i]}`
    item.granularity = i
    item.value = 1
    data.push(item)
  }
  return data
}
