# -*- mode: ruby -*-
# vi: set ft=ruby :

require 'fileutils'

current_dir     = File.dirname(__FILE__)
my_variables    = File.join(current_dir, 'app','styles','variables.less')
my_bootstrap    = File.join(current_dir, 'app','bower_components','bootstrap','dist','css','bootstrap.min.css')

bootswatch_dir  = File.join(ENV['HOME'], 'git', 'bootswatch')
boot_variables  = File.join(bootswatch_dir, 'custom', 'variables.less')
boot_bootstrap  = File.join(bootswatch_dir, 'custom', 'bootstrap.min.css')

def exec(dir,cmd)
  puts "Executing Command: '#{cmd}'"
  Dir.chdir(dir) { system cmd }
end

FileUtils.copy(my_variables, boot_variables)
exec(bootswatch_dir, "grunt swatch:custom")

FileUtils.mv(boot_bootstrap, my_bootstrap)