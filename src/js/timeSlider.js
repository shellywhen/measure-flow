const timeSliderDivId = 'timesliderFrame'
const timesliderHeight = $('#' + timeSliderDivId).innerHeight()
const timesliderWidth = $('#' + timeSliderDivId).innerWidth()
const margin = {
  'top': 5,
  'left': 5,
  'right': 5,
  'bottom': 0
}
let drawTimeSlider = function (alignRight = 0, width_middle = 50) {
  let height = timesliderHeight - margin.top - margin.bottom
  //let width = timesliderWidth - margin.left - margin.right - alignRight
  let width = width_middle
  let svg = d3.select('#' + timeSliderDivId)
    .append('svg')
    .attr('height', timesliderHeight)
    .attr('width', timesliderWidth)
    .append('g')
    .attr('transform', `translate( +${margin.left + alignRight} , ${margin.top})`)


  let dg = networkcube.getDynamicGraph()
  let timeObjArray = dg.timeArrays.momentTime.map(v => v._d)
  let startTimeObj = timeObjArray[0]
  let endTimeObj = timeObjArray[timeObjArray.length - 1]
  window.activeTime = {start: new Date(dg.roundedStart), end: new Date(dg.roundedEnd), startId: 0, endId: timeObjArray.length - 1}
  let xScale = d3.scaleTime().range([0, width]).domain([new Date(dg.roundedStart), new Date(dg.roundedEnd)])
  let xAxis = d3.axisTop(xScale).ticks(5)

  svg.append('text')
     .attr('id', 'timeStartText')

  svg.append('text')
     .attr('id', 'timeEndText')

  let brushendCallback = function (d) {
    brushed()
    let selection = d3.event.selection || xScale.range()
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    networkcube.sendMessage('period', {'start': brushStart.getTime(), 'end': brushEnd.getTime()})
  }

  let brushed = function () {
    let selection = d3.event.selection || xScale.range()
    let brushStart = xScale.invert(selection[0])
    let brushEnd = xScale.invert(selection[1])
    let options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    d3.select('#timeStartText')
      .classed('annotation', true)
      .text(brushStart.toLocaleDateString("en-US", options))
      .attr('transform', 'translate('+ selection[0] + ', '+ 3 * height / 4 + ')')
      .attr('text-anchor', 'end')
    d3.select('#timeEndText')
      .classed('annotation', true)
      .text(brushEnd.toLocaleDateString("en-US", options))
      .attr('transform', 'translate('+ selection[1] + ', '+ 3 * height / 4 + ')')
      .attr('text-anchor', 'start')
     networkcube.timeRange(brushStart.getTime(), brushEnd.getTime(), true)
    networkcube.sendMessage('timerange', {startUnix: brushStart.getTime(), endUnix: brushEnd.getTime() })

  }

  svg.selectAll('.snapshot')
    .data(dg.timeArrays.momentTime)
    .enter()
    .append('line')
    .style('stroke', '#E2E6EA')
    .classed('snapshot', true)
    .attr('x1', d => xScale(d._d))
    .attr('x2', d => xScale(d._d))
    .attr('y1', 0)
    .attr('y2', height / 3)

  let brush = d3.brushX()
    .extent([[0, height / 3], [width, 2 * height / 3]])
    .on('brush end', brushed)
    .on('end', brushendCallback)
  let brushG = svg.append('g')
    .classed('brush', true)
    .call(brush)
    .call(brush.move, xScale.range())
  svg.append('g')
    .classed('x-axis', true)
    .attr('transform', 'translate(0, ' + height / 3 + ')' )
    .call(xAxis)
  let moveHandle = function (m) {
    let msg = m.body
    let start = new Date(msg.timeStart)
    let end = new Date(msg.timeEnd)
    brushG.call(brush.move, [xScale(start), xScale(end)])
  }
  networkcube.addEventListener('focusPeriod', moveHandle)
}

export {drawTimeSlider}
