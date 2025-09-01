Vagrant.configure("2") do |config|
    # Trigger to run post-cluster setup after all VMs are up
    # config.trigger.after :up do |trigger|
    #     trigger.run = {inline: "echo 'All VMs are up. Starting automated post-cluster setup...'"}
    #     trigger.run = {inline: "vagrant ssh master-1 -c \"sudo bash /vagrant/auto-post-setup.sh\""}
    # end

    (1..1).each do |i|
        config.vm.define "master-#{i}" do |master|
            master.vm.box = "ubuntu/jammy64"
            master.vm.hostname = "master-#{i}"
            master.vm.network "private_network", ip: "172.89.0.1#{i}"

            master.ssh.insert_key = false
            master.ssh.private_key_path = ['~/.vagrant.d/insecure_private_key', '~/.ssh/id_rsa']
            master.vm.provision "file", source: "~/.ssh/id_rsa.pub", destination: "~/.ssh/authorized_keys"
            master.vm.provision "shell", path: "common.sh"
            
            # Configure kubelet to use the correct node IP
            master.vm.provision "shell", inline: <<-SHELL
                cat > /etc/default/kubelet <<EOF
KUBELET_EXTRA_ARGS="--node-ip=172.89.0.1#{i}"
EOF
            SHELL
            
            master.vm.provision "shell", path: "master.sh"

            master.vm.provider "virtualbox" do |vb|
              vb.gui = false
              vb.cpus = 2
              vb.memory = "2048"
            end
        end
    end

    (1..2).each do |i|
        config.vm.define "worker-#{i}" do |worker|
            worker.vm.box = "ubuntu/jammy64"
            worker.vm.hostname = "worker-#{i}"
            worker.vm.network "private_network", ip: "172.89.0.2#{i}"

            worker.ssh.insert_key = false
            worker.ssh.private_key_path = ['~/.vagrant.d/insecure_private_key', '~/.ssh/id_rsa']
            worker.vm.provision "file", source: "~/.ssh/id_rsa.pub", destination: "~/.ssh/authorized_keys"
            worker.vm.provision "shell", path: "common.sh"
            
            # Configure kubelet to use the correct node IP
            worker.vm.provision "shell", inline: <<-SHELL
                cat > /etc/default/kubelet <<EOF
KUBELET_EXTRA_ARGS="--node-ip=172.89.0.2#{i}"
EOF
            SHELL
            
            worker.vm.provision "shell", path: "worker.sh"

            worker.vm.provider "virtualbox" do |vb|
              vb.gui = false
              vb.cpus = 1
              vb.memory = "2048"
            end
        end
    end
end
