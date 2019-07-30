const timeSliderDivId = 'timesliderFrame'
const timesliderHeight = $('#' + timeSliderDivId).innerHeight()
const timesliderWidth = $('#' + timeSliderDivId).innerWidth()
const margin = {
  'top': 5,
  'left': 35,
  'right': 35,
  'bottom': 0
}
let drawTimeSlider = function () {
  let height = timesliderHeight - margin.top - margin.bottom
  let width = timesliderWidth - margin.left - margin.right
  let svg = d3.select('#' + timeSliderDivId)
    .append('svg')
    .attr('transform', 'translate(' + margin.left + ','+ margin.top + ')')
    .attr('height', height)
    .attr('width', width)

  let dg = window.dgraph
  let timeObjArray = dg.timeArrays.momentTime.map(v => v._d)
  let startTimeObj = timeObjArray[0]
  let endTimeObj = timeObjArray[timeObjArray.length - 1]

  let xScale = d3.scaleTime().range([0, width])
  let xAxis = d3.axisTop(xScale).ticks(5)
  xScale.domain([startTimeObj, endTimeObj])

  svg.append('text')
     .attr('id', 'timeStartText')

  svg.append('text')
     .attr('id', 'timeEndText')

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

    networkcube.timeRange(brushStart.getTime(), brushEnd.getTime())
  }
  svg.selectAll('.snapshot')
    .data(dg.timeArrays.momentTime)
    .enter()
    .append('line')
    .style('stroke', '#E2E6EA')
    .classed('snapshot', true)
    .attr('x1', d => xScale(d._d))
    .attr('x2', d => xScale(d._d))
    .attr('y1', height / 8)
    .attr('y2', height / 3)

  let brush = d3.brushX()
    .extent([[0, height / 3], [width, 2 * height / 3]])
    .on('brush end', brushed)
  svg.append('g')
    .classed('brush', true)
    .call(brush)
    .call(brush.move, xScale.range())
  svg.append('g')
    .classed('x-axis', true)
    .attr('transform', 'translate(0, ' + height / 3 + ')' )
    .call(xAxis)
}

export {drawTimeSlider}
