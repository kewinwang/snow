module.exports = exports = function(app) {
    app.post('/admin/panic', app.auth.admin, exports.panic)
}

exports.panic = function(req, res, next) {
    var dbName = req.app.conn.write.connectionParameters.database

    req.app.conn.write.query([
        'ALTER DATABASE ' + dbName,
        'SET default_transaction_read_only = true;'
    ].join('\n'), function(err) {
        if (err) {
            if (err.message.match(/in a read-only transaction/)) {
                return res.send(409, {
                    name: 'AlreadyReadOnly',
                    message: 'Database is already read only'
                })
            }

            return next(err)
        }

        req.app.conn.write.query([
            'SET TRANSACTION read write;',
            'SELECT pg_terminate_backend(pid)',
            'FROM pg_stat_activity;'
        ].join('\n'), function(err) {
            if (err) {
                if (err.message.match(/terminating connection/)) {
                    return res.send(204)
                }

                return next(err)
            }

            res.send(204)
        })
    })
}
