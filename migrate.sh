#For migration run these commands, tunnel mysql from haba port 3306, after these run knex db-migrate 
#git clone git@github.com:dimitri/pgloader.git
#sudo docker build ./pgloader -t pgloader
#sudo docker run -it --network="host" --rm -v ./rv.load:/rv.load pgloader:latest bash
