use std::{fs::{self, OpenOptions}, io::{BufRead, BufReader, BufWriter, Write}};
pub struct File ();

pub enum SearchResult<T> {
    FileNotExist,
    FileEmpty,
    NoItemFound,
    Ok(T)
}

impl File {
    fn create(name: &str) {
        let file = fs::File::create(name);

        if file.is_err() {
            eprintln!("ERRO AO CRIAR ARQUIVO");
            return;
        }

    }
 

    pub fn insert_table(table_name: String, schema: String, peer: String) -> bool {
        let res = fs::exists("./schema.table");

        if res.is_err() {
            eprintln!("ERRO AO TENTAR VERIFICAR SE ARQUIVO EXISTE");
            return false;
        };

        let file_exist = res.unwrap();

        if !file_exist {
            eprintln!("ARQUIVO NÂO EXISTE, CRIANDO UM");
            File::create("schema.table");
        };

        let file = OpenOptions::new()
            .write(true)
            .append(true)
            .open("./schema.table");

        if file.is_err() {
            eprintln!("ERRO AO ABRIR ARQUIVO");
            return false;
        }

        let mut writer = BufWriter::new(file.unwrap());
        let write_result = writeln!(writer, "{}|{}|{}", table_name, schema, peer);

        if write_result.is_err() {
            eprintln!("NÂO FOI POSSIVEL ESCREVER EM ARQUIVO");
            return false;
        }
        
        let flush_res = writer.flush();

        if flush_res.is_err() {
            eprintln!("ERRO AO DAR FLUSH: {}", flush_res.err().unwrap());
            return false;
        }


        return true;
    }

    pub fn insert_base(base_name: String,  peer: String, acess_hash: String) -> bool {
        let res = fs::exists("./schema.base");

        if res.is_err() {
            eprintln!("ERRO AO TENTAR VERIFICAR SE ARQUIVO EXISTE");
            return false;
        };

        let file_exist = res.unwrap();

        if !file_exist {
            eprintln!("ARQUIVO NÂO EXISTE, CRIANDO UM");
            File::create("schema.base");
        };

        let file = OpenOptions::new()
            .write(true)
            .append(true)
            .open("./schema.base");

        if file.is_err() {
            eprintln!("ERRO AO ABRIR ARQUIVO");
            return false;
        }

        let mut writer = BufWriter::new(file.unwrap());
        let write_result = writeln!(writer, "{}|{}|{}", base_name, peer, acess_hash);

        if write_result.is_err() {
            eprintln!("NÂO FOI POSSIVEL ESCREVER EM ARQUIVO");
            return false;
        }
        
        let flush_res = writer.flush();

        if flush_res.is_err() {
            eprintln!("ERRO AO DAR FLUSH: {}", flush_res.err().unwrap());
            return false;
        }


        return true;
    }

    pub fn search_base(base_name: String) -> SearchResult<(i64, i64)> {
        let file = fs::File::open("schema.base");
    
        if file.is_err() {
            eprintln!("ARQUIVO NÂO EXISTE");
            return SearchResult::FileNotExist;
        }

        let buf_reader = BufReader::new(file.unwrap());

        for lines_res in buf_reader.lines() {
            if lines_res.is_err() {
                eprintln!("LINHA VAZIA");
                continue;
            }

            let lines = lines_res.unwrap();

            let name = lines.split("|").collect::<Vec<&str>>()[0];
            let peer = lines.split("|").collect::<Vec<&str>>()[1];
            let acess_hash = lines.split("|").collect::<Vec<&str>>()[2];


            if name == base_name {
                return SearchResult::Ok((peer.parse::<i64>().unwrap(), acess_hash.parse::<i64>().unwrap()));
            }
        }

        return SearchResult::NoItemFound;
    }

    pub fn search_table(table_name: String) -> SearchResult<(String, String)> {
        let file = fs::File::open("schema.table");
    
        if file.is_err() {
            eprintln!("ARQUIVO NÂO EXISTE");
            return SearchResult::FileNotExist;
        }

        let buf_reader = BufReader::new(file.unwrap());

        for lines_res in buf_reader.lines() {
            if lines_res.is_err() {
                eprintln!("ARQUIVO VAZIO");
                return SearchResult::FileEmpty;
            }
            
            let lines = lines_res.unwrap();
            
            let name = lines.split("|").collect::<Vec<&str>>()[0];
            let schema = lines.split("|").collect::<Vec<&str>>()[1];
            let peer = lines.split("|").collect::<Vec<&str>>()[2];

            if name == table_name {
                return SearchResult::Ok((schema.to_string(), peer.to_string()));
            }
        }

        return SearchResult::NoItemFound;
    }
}