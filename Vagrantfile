Vagrant.configure("2") do |config|
    (1..1).each do |i|
        config.vm.define "master-#{i}" do |master|
            master.vm.box = "ubuntu/jammy64"
            master.vm.hostname = "master-#{i}"
            master.vm.network "private_network", ip: "172.89.0.1#{i}"

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
              vb.memory = "4096"
            end
        end
    end

    (1..2).each do |i|
        config.vm.define "worker-#{i}" do |worker|
            worker.vm.box = "ubuntu/jammy64"
            worker.vm.hostname = "worker-#{i}"
            worker.vm.network "private_network", ip: "172.89.0.2#{i}"

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
              vb.cpus = 2
              vb.memory = "4096"
            end
        end
    end
end
