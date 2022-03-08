module.exports = {
  plugins: [
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [
          {
            // Don't use display, visibility, and opacity because empty svg element is output
            style: 'position: fixed; z-index: -1;'
          }
        ]
      }
    }
  ]
}
