var express = require ('express');
var app = express();
var bodyParser = require("body-parser");
var _ = require ("lodash");
var flatten = require ('flat');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var mongoose = require ("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var dbHost = 'mongodb://localhost:27017/populateDb';
mongoose.connect(dbHost);

var phoneSchema = new Schema({
    phnNo: {
        type: String,
        default: null
    }
});

var studentSchema = new Schema({
    studentName: {
        type: String,
        required: true
    },
    rollNo: {
        type: Number,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    address: {
        streetName: String, 
        city: String, 
        pincode: Number
    },
    phone: [phoneSchema],
    emailId: {
        type: String,
        lowercase: true
    }
});

var bookSchema = new Schema({
    bookName:{ 
        type: String,
        required: true
    },
    author:{
        type: String,
        required: true
    },
    pages:{
        type: Number
    }    
})

var transactionSchema = new Schema({
    book:{
        type: Schema.Types.ObjectId,
        ref: 'book'
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'person'
    },
    issueDate: {
        type: Date,        
        default: Date.now
    },
    dueDate:{
        type: Date,
        required: true
    },
    returned: {
        type: Boolean,
        default: false
    }
});

var person = mongoose.model('person', studentSchema, "students");
var book = mongoose.model('book', bookSchema, "books")
var transaction = mongoose.model('transaction',transactionSchema,"transactions");
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    console.log("Connected to DB"); 

    app.post('/transaction/:bId',function(req,res){
        var bId = req.params.bId;
        var sId = req.body.sId;
        var issueDate = req.body.issueDate;
        var dueDate = req.body.dueDate;
        transaction.find({
            $and: [
                 {'book': bId},
                 {'returned': false}
                 ]
                },function(err, docs){
                    if(_.isEmpty(docs)){
                         var issuedBook = new transaction ({
                             book: bId,
                             student: sId,
                             dueDate: dueDate,
                             issueDate: issueDate,
                             returned: false
                         });
                        
                         issuedBook.save(function(err){
                             if(err) throw err;
                             res.status(200).json({                                 
                                 'status': 'success',
                                 'message':'Transaction are saved.'
                             });
                         });
                    } else {
                         res.status(404).json({                             
                             'status': 'success',
                             'message':'Book is not available'
                         });
                    }
                });
    });

    app.get('/transaction/:tId', function (req, res) {
        var tId = req.params.tId;
        transaction
        .findOne({ '_id': tId })
        .populate('book student')
        .exec(function(err,docs){
            if(err) throw err;
            if(!docs){
                res.status(404).json({
                    'status': 'success',
                    'message': 'No transaction'
                });
            } else {
                _.flatMapDeep(docs._doc, function(value, key){
                    console.log(key + ": "+ value);
                })
                res.status(200).json(docs);
            }
        });
    });

    app.get('/transaction', function (req, res) {        
        transaction.aggregate(
            // {
            //     $match:{ returned : false }
            // },
            {
                $group: {
                    _id: {
                       "student": "$student"
                    },
                    count: { $sum: 1 }
                } 
            }, function(err,docs){
            if(err) throw err;
            if(_.isEmpty(docs)){
                res.status(404).json({
                    'status': 'success',
                    'message': 'No transaction'
                });
            } else {
                res.status(200).json(docs);
            }
        });
    });

    app.post('/student',function(req,res) {
        var studentName = req.body.studentName;
        var rollNo1 = req.body.rollNo;
        var dob1 = req.body.dob;
        var streetName1 = req.body.streetName;
        var city1 = req.body.city;
        var pincode1 = req.body.pincode;
        var phone1 = req.body.phone;
        var emailId1 = req.body.emailId;        
        var people = new person ({
            studentName: studentName,
            rollNo: rollNo1,
            dob: dob1,
            address: {
                streetName :streetName1,
                city : city1,
                pincode : pincode1
            },
            phone: phone1,
            emailId: emailId1            
        });
        
        people.save(function(err){
            if ( err ) throw err;
            res.end('Details of the Student: ' + studentName + ' are saved');
        });          
  });

  app.get('/student',function(req,res) {        
        person.find({},function(err,docs) {
            if(err){
                res.sendStatus(204);
            }
            if(_.isEmpty(docs)){
                res.status(404).send("Student not found");
            }
            res.status(200).json(docs);
        });
    });

  app.post('/book', function(req,res){
            var bookName = req.body.bookName;
            var author = req.body.author;
            var pages = req.body.pages;            
            var library = new book ({
                bookName: bookName,
                author: author,
                pages: pages               
            });

            library.save(function(err){
                if(err) throw err;
                res.status(200).send("Details of the book:" + bookName +" are saved.");
            });
    });

    app.get('/book',function(req,res){        
        book.find({},function(err, docs){
            if(err){
                res.sendStatus(204);
            };
            if(!docs){
                res.status(404).send("Book not found");
            };
            res.status(200).json(docs);
        })
    });    

    app.put('/transaction/:id',function(req,res){
        var id = req.params.id;
        transaction.update({'book':id},{
            $set:{
                returned: true
            }
        },function(err, docs){
            if(err){
                res.sendStatus(204);
            };
            if(!docs){
                res.status(200).send(" This Book Transaction is not available");
            };
            res.status(200).send("Transaction updated.");            
        })
    });
    app.listen(8000);
    console.log("Server running at http://127.0.0.1:8000/")

});

// let dueDate = new Date();
                        // dueDate.setDate(dueDate.getDate()+15);
                         // res.status(200).send("Book is available.you can take the book");

                         