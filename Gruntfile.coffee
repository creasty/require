
module.exports = (grunt) ->

  # Load npm tasks
  #-----------------------------------------------
  require('matchdep').filterDev('grunt-*').forEach grunt.loadNpmTasks

  # Config
  #-----------------------------------------------
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    banner:
      """
      /*!
       * <%= pkg.title || pkg.name %> - v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>)
       *
       * @author <%= pkg.author %>
       * @url <%= pkg.homepage %>
       * @copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>
       */

      """

    watch:
      coffee:
        files: ['src/*.coffee', 'spec/scripts/*.coffee']
        tasks: ['coffee', 'notifydone']

      jasmine:
        files: ['dist/*.js', 'spec/scripts/*.js']
        tasks: ['jasmine:test:build', 'reload']

    coffee:
      coffee:
        expand: true,
        cwd: 'src',
        src: ['*.coffee'],
        dest: 'dist',
        ext: '.js'

      test:
        expand: true,
        cwd: 'spec/scripts',
        src: ['*.coffee'],
        dest: 'spec/scripts',
        ext: '.js'

    jasmine:
      options:
        specs: 'spec/scripts/*Spec.js',
        helpers: 'spec/scripts/*Helper.js'
        outfile: 'SpecRunner.html'
        vendor: ['vendors/jquery/jquery.js']

      test:
        src: ['dist/require.js']

    concat:
      dist:
        src: ['dist/require.js']
        dest: 'dist/require.js'
        options:
          stripBanners: true
          banner: '<%= banner %>'

    uglify:
      options:
        preserveComments: 'some'

      dist:
        src: ['dist/require.js']
        dest: 'dist/require.min.js'

  # Tasks
  #-----------------------------------------------
  grunt.registerTask 'default', ['dev']

  grunt.registerTask 'dev', [
    'coffee'
    'notifydone'
  ]
  grunt.registerTask 'prod', [
    'coffee'
    'concat'
    'uglify'
    'notifydone'
  ]
  grunt.registerTask 'test', [
    'coffee'
    'jasmine:test:build'
    'watch'
  ]

  #  Custom Task
  #-----------------------------------------------
  grunt.registerTask 'notifydone', 'done!', ->
    growlnotify 'All tasks done', title: 'Grunt Done', name: 'Grunt'

  grunt.registerTask 'reload', 'reload', ->
    reloadChrome()
    growlnotify 'Reloaded', title: 'Chrome', name: 'Grunt'

  # Error Notify
  #-----------------------------------------------
  hooker = require 'hooker'

  ['warn', 'fatal'].forEach (level) ->
    hooker.hook grunt.fail, level, (message) ->
      level = level.charAt(0).toUpperCase() + level.substr 1
      growlnotify message, title: "Grunt #{level}", name: 'Grunt'

  hooker.hook grunt.log, 'write', (message) ->
    message = grunt.log.uncolor message

    if message.indexOf('>> Error: ') >= 0
      growlnotify message.substr(10), title: 'Grunt Error', name: 'Grunt', sticky: true


#=== Growl
#==============================================================================================
exec = require('child_process').exec

escapeshellarg = (str) ->
  str = JSON.stringify str
  str = str.replace /\\n/g, '\n'

growlnotify = (message, option = {}) ->
  args = ['growlnotify']

  if message
    args.push '-m', escapeshellarg message

  if option.sticky
    args.push '-s'

  if option.name
    args.push '-n', escapeshellarg option.name

  if option.title
    args.push '-t', escapeshellarg option.title

  exec args.join ' '

reloadChrome = ->
  exec 'osascript -e \'tell application \"Google Chrome\" to tell the active tab of its first window to reload\''
